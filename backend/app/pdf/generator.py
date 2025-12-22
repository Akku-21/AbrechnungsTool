"""
PDF-Generator für Nebenkostenabrechnungen
"""
import io
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Optional, List
from uuid import UUID

from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from pypdf import PdfReader, PdfWriter
import img2pdf

from app.models.settlement import Settlement
from app.models.settlement_result import SettlementResult, SettlementCostBreakdown
from app.models.document import Document
from app.models.invoice import Invoice
from app.models.settings import Settings
from app.models.enums import COST_CATEGORY_LABELS
from app.config import settings
from app.services.signing_service import create_signing_service


def get_setting(db: Session, key: str, default: str = "") -> str:
    """Hole einen Einstellungswert aus der DB"""
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else default


class PDFGenerator:
    """Generator für Nebenkostenabrechnung PDFs"""

    def __init__(self):
        template_dir = Path(__file__).parent / "templates"
        self.env = Environment(loader=FileSystemLoader(template_dir))

        # Deutsche Formatierung registrieren
        self.env.filters['euro'] = self._format_euro
        self.env.filters['german_date'] = self._format_german_date
        self.env.filters['percentage'] = self._format_percentage
        self.env.filters['area'] = self._format_area

        # Signing Service initialisieren (falls konfiguriert)
        self.signing_service = create_signing_service(
            settings.SIGNING_CERT_PATH,
            settings.SIGNING_CERT_PASSWORD
        )

    def generate_settlement_pdf(
        self,
        settlement_id: UUID,
        db: Session
    ) -> bytes:
        """Generiere PDF für eine Abrechnung"""
        settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()

        if not settlement:
            raise ValueError(f"Abrechnung nicht gefunden: {settlement_id}")

        results = db.query(SettlementResult).filter(
            SettlementResult.settlement_id == settlement_id
        ).all()

        if not results:
            raise ValueError("Keine Berechnungsergebnisse vorhanden. Bitte zuerst berechnen.")

        # Template laden
        template = self.env.get_template("settlement.html")

        # Daten für Template aufbereiten
        property_obj = settlement.property_ref
        results_data = []

        for result in results:
            breakdowns = db.query(SettlementCostBreakdown).filter(
                SettlementCostBreakdown.settlement_result_id == result.id
            ).all()

            results_data.append({
                'unit': result.unit,
                'tenant': result.tenant,
                'total_costs': result.total_costs,
                'total_prepayments': result.total_prepayments,
                'balance': result.balance,
                'occupancy_days': result.occupancy_days,
                'breakdowns': breakdowns
            })

        # Rechnungen für Übersicht laden
        invoices = db.query(Invoice).filter(
            Invoice.settlement_id == settlement_id
        ).order_by(Invoice.cost_category, Invoice.invoice_date).all()

        # Rechnungsdaten aufbereiten
        invoices_data = []
        for inv in invoices:
            allocation = float(inv.allocation_percentage) if inv.allocation_percentage else 1.0
            invoices_data.append({
                'vendor_name': inv.vendor_name,
                'invoice_number': inv.invoice_number,
                'invoice_date': inv.invoice_date,
                'cost_category': inv.cost_category,
                'total_amount': inv.total_amount,
                'allocation_percentage': allocation,
                'allocated_amount': inv.total_amount * Decimal(str(allocation)),
                'document_id': str(inv.document_id) if inv.document_id else None
            })

        # Anhänge laden (für Platzhalter im HTML)
        attachments = db.query(Document).filter(
            Document.settlement_id == settlement_id,
            Document.include_in_export == True
        ).order_by(Document.upload_date).all()

        # Vermieter-Daten aus Einstellungen laden
        landlord = {
            'name': get_setting(db, 'company_name'),
            'street': get_setting(db, 'company_street'),
            'postal_code': get_setting(db, 'company_postal_code'),
            'city': get_setting(db, 'company_city'),
        }

        # HTML rendern (mit Platzhaltern für Anhänge)
        html_content = template.render(
            settlement=settlement,
            property=property_obj,
            results=results_data,
            invoices=invoices_data,
            cost_category_labels=COST_CATEGORY_LABELS,
            generated_date=date.today(),
            attachments=attachments,  # Für Link-Platzhalter
            landlord=landlord
        )

        # CSS laden
        css_path = Path(__file__).parent / "templates" / "styles.css"
        css = CSS(filename=str(css_path)) if css_path.exists() else None

        # PDF generieren
        html = HTML(string=html_content)

        if css:
            main_pdf_bytes = html.write_pdf(stylesheets=[css])
        else:
            main_pdf_bytes = html.write_pdf()

        if attachments:
            pdf_bytes = self._merge_pdfs_with_attachments(main_pdf_bytes, attachments)
        else:
            pdf_bytes = main_pdf_bytes

        # Digital signieren (falls konfiguriert)
        if self.signing_service:
            period_label = f"{settlement.period_start.strftime('%d.%m.%Y')} - {settlement.period_end.strftime('%d.%m.%Y')}"
            pdf_bytes = self.signing_service.sign_pdf(
                pdf_bytes,
                reason=f"Nebenkostenabrechnung {period_label}"
            )

        return pdf_bytes

    def _merge_pdfs_with_attachments(
        self,
        main_pdf_bytes: bytes,
        attachments: List[Document]
    ) -> bytes:
        """Füge Anhänge zum Haupt-PDF hinzu mit internen Links"""
        writer = PdfWriter()

        # Haupt-PDF hinzufügen (letzte Seite ist Platzhalter, wird übersprungen)
        main_reader = PdfReader(io.BytesIO(main_pdf_bytes))
        main_page_count = len(main_reader.pages)

        # Alle Seiten außer der letzten (Platzhalter-Seite) hinzufügen
        for i in range(main_page_count - 1):
            writer.add_page(main_reader.pages[i])

        # Aktuelle Seitenzahl (0-basiert, ohne Platzhalter-Seite)
        current_page = len(writer.pages)

        # Mapping: doc.id -> Seitenzahl (für Named Destinations)
        doc_page_mapping = {}

        # Anhänge hinzufügen
        for doc in attachments:
            try:
                attachment_pdf = self._document_to_pdf(doc)
                if attachment_pdf:
                    attachment_reader = PdfReader(io.BytesIO(attachment_pdf))

                    # Merken, wo dieses Dokument startet
                    doc_page_mapping[str(doc.id)] = current_page

                    # Seiten hinzufügen
                    for page in attachment_reader.pages:
                        writer.add_page(page)

                    current_page += len(attachment_reader.pages)
            except Exception as e:
                print(f"Fehler beim Hinzufügen von Anhang {doc.original_filename}: {e}")
                continue

        # Named Destinations aktualisieren (überschreiben die Platzhalter-Destinations)
        for doc_id, page_index in doc_page_mapping.items():
            try:
                writer.add_named_destination(f"doc-{doc_id}", page_index)
            except Exception as e:
                print(f"Fehler beim Erstellen von Named Destination doc-{doc_id}: {e}")

        # Zusammengeführtes PDF ausgeben
        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()

    def _document_to_pdf(self, doc: Document) -> Optional[bytes]:
        """Konvertiere Dokument zu PDF (falls nötig)"""
        file_path = Path(doc.file_path)

        if not file_path.exists():
            return None

        mime_type = doc.mime_type.lower()

        # Bereits ein PDF
        if mime_type == 'application/pdf':
            return file_path.read_bytes()

        # Bild zu PDF konvertieren
        if mime_type.startswith('image/'):
            try:
                with open(file_path, 'rb') as img_file:
                    return img2pdf.convert(img_file)
            except Exception as e:
                print(f"Fehler bei Bildkonvertierung: {e}")
                return None

        return None

    @staticmethod
    def _format_euro(value: Decimal) -> str:
        """Formatiere als Euro-Betrag"""
        if value is None:
            return "0,00 EUR"
        # Deutsches Format: 1.234,56 EUR
        formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"{formatted} EUR"

    @staticmethod
    def _format_german_date(d: date) -> str:
        """Formatiere Datum im deutschen Format"""
        if d is None:
            return ""
        return d.strftime("%d.%m.%Y")

    @staticmethod
    def _format_percentage(value: Decimal) -> str:
        """Formatiere als Prozent"""
        if value is None:
            return "0,00 %"
        percent = value * 100
        return f"{percent:.2f} %".replace(".", ",")

    @staticmethod
    def _format_area(value: Decimal) -> str:
        """Formatiere als Flächenangabe"""
        if value is None:
            return "0,00 m²"
        formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"{formatted} m²"
