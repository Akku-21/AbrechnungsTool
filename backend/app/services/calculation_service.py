"""
Service für die Berechnung von Nebenkostenabrechnungen
"""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.settlement import Settlement
from app.models.property import Property
from app.models.unit import Unit
from app.models.tenant import Tenant
from app.models.invoice import Invoice
from app.models.manual_entry import ManualEntry
from app.models.unit_allocation import UnitAllocation
from app.models.settlement_result import SettlementResult, SettlementCostBreakdown
from app.models.enums import CostCategory, AllocationMethod, SettlementStatus


class CalculationService:
    """Service für Nebenkostenberechnungen"""

    def calculate_settlement(self, settlement_id: UUID, db: Session) -> list[SettlementResult]:
        """
        Berechne die Nebenkostenabrechnung für alle Wohneinheiten
        """
        settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
        if not settlement:
            raise ValueError(f"Abrechnung nicht gefunden: {settlement_id}")

        property_obj = settlement.property_ref

        # Alle Einheiten der Liegenschaft
        units = db.query(Unit).filter(Unit.property_id == property_obj.id).all()

        if not units:
            raise ValueError("Keine Wohneinheiten in dieser Liegenschaft")

        # Alle Rechnungen der Abrechnung summiert nach Kategorie
        original_costs, allocated_costs, invoice_allocations = self._get_costs_by_category(settlement, db)

        # Manuelle Buchungen
        manual_entries = db.query(ManualEntry).filter(
            ManualEntry.settlement_id == settlement_id
        ).all()

        # Vor dem Löschen: Dokument-Unit-Zuordnung speichern
        # (Dokumente mit settlement_result_id werden nach Neuberechnung wieder verknüpft)
        from app.models.document import Document
        doc_unit_mapping: dict[UUID, UUID] = {}  # document_id -> unit_id
        old_results = db.query(SettlementResult).filter(
            SettlementResult.settlement_id == settlement_id
        ).all()
        for old_result in old_results:
            for doc in old_result.documents:
                doc_unit_mapping[doc.id] = old_result.unit_id

        # Alte Ergebnisse löschen (Dokumente bekommen settlement_result_id=NULL durch SET NULL FK)
        db.query(SettlementResult).filter(
            SettlementResult.settlement_id == settlement_id
        ).delete()

        results = []
        # Mapping: unit_id -> neues SettlementResult für spätere Dokument-Verknüpfung
        unit_to_result: dict[UUID, SettlementResult] = {}

        for unit in units:
            # Aktiven Mieter im Abrechnungszeitraum finden
            tenant = self._get_tenant_for_period(
                unit,
                settlement.period_start,
                settlement.period_end
            )

            if not tenant:
                continue  # Keine Abrechnung für leerstehende Einheiten

            # Belegungstage berechnen
            occupancy_days = self._calculate_occupancy_days(
                tenant,
                settlement.period_start,
                settlement.period_end
            )

            total_days = (settlement.period_end - settlement.period_start).days + 1

            # Kosten pro Kategorie berechnen
            total_costs = Decimal('0')
            breakdowns = []

            for category, category_allocated in allocated_costs.items():
                # Verteilerschlüssel für diese Einheit und Kategorie (Wohnflächenanteil)
                unit_allocation = self._get_allocation(unit, category, property_obj, db)

                # Invoice-Allocation für diese Kategorie
                inv_allocation = invoice_allocations.get(category, Decimal('1'))

                # Original-Rechnungsbetrag (vor Invoice-Allocation)
                original_total = original_costs.get(category, Decimal('0'))

                # Anteil berechnen (Invoice-Allocation × Unit-Allocation)
                allocated_amount = category_allocated * unit_allocation.percentage

                # Zeitanteil (bei Mieterwechsel)
                if occupancy_days < total_days:
                    allocated_amount = allocated_amount * Decimal(occupancy_days) / Decimal(total_days)

                allocated_amount = allocated_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                total_costs += allocated_amount

                # Kombinierter Anteil: Invoice-Allocation × Unit-Allocation
                combined_percentage = inv_allocation * unit_allocation.percentage

                breakdowns.append(SettlementCostBreakdown(
                    cost_category=category,
                    total_property_cost=original_total,  # Original-Rechnungsbetrag
                    allocation_percentage=combined_percentage,  # Kombinierter Anteil
                    allocated_amount=allocated_amount,
                    allocation_method=unit_allocation.method
                ))

            # Manuelle Einträge für diese Einheit
            unit_manual_entries = [
                e for e in manual_entries
                if e.unit_id is None or e.unit_id == unit.id
            ]

            for entry in unit_manual_entries:
                if entry.unit_id is None:
                    # Für alle Einheiten: Anteil berechnen
                    share = unit.area_sqm / property_obj.total_area_sqm
                    amount = entry.amount * share
                else:
                    # Nur für diese Einheit
                    amount = entry.amount

                total_costs += amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # Vorauszahlungen berechnen
            total_prepayments = self._calculate_prepayments(
                tenant,
                settlement.period_start,
                settlement.period_end
            )

            # Saldo: Positiv = Nachzahlung, Negativ = Guthaben
            balance = total_costs - total_prepayments

            # Ergebnis speichern
            result = SettlementResult(
                settlement_id=settlement_id,
                unit_id=unit.id,
                tenant_id=tenant.id,
                total_costs=total_costs,
                total_prepayments=total_prepayments,
                balance=balance,
                occupancy_days=occupancy_days,
                calculation_details={
                    "period_start": settlement.period_start.isoformat(),
                    "period_end": settlement.period_end.isoformat(),
                    "total_days": total_days,
                    "unit_area": float(unit.area_sqm),
                    "property_area": float(property_obj.total_area_sqm)
                }
            )

            db.add(result)
            db.flush()

            # Kostenaufschlüsselung speichern
            for breakdown in breakdowns:
                breakdown.settlement_result_id = result.id
                db.add(breakdown)

            results.append(result)
            unit_to_result[unit.id] = result

        # Dokumente wieder mit neuen SettlementResults verknüpfen
        if doc_unit_mapping:
            for doc_id, unit_id in doc_unit_mapping.items():
                if unit_id in unit_to_result:
                    new_result = unit_to_result[unit_id]
                    db.query(Document).filter(Document.id == doc_id).update(
                        {"settlement_result_id": new_result.id}
                    )

        # Status aktualisieren
        settlement.status = SettlementStatus.CALCULATED
        db.commit()

        return results

    def _get_costs_by_category(
        self,
        settlement: Settlement,
        db: Session
    ) -> tuple[dict[CostCategory, Decimal], dict[CostCategory, Decimal], dict[CostCategory, Decimal]]:
        """
        Summiere alle Rechnungsbeträge nach Kategorie.

        Returns:
            Tuple of:
            - original_costs: Original invoice totals (before allocation)
            - allocated_costs: Allocated amounts (after invoice allocation)
            - invoice_allocations: Weighted average invoice allocation per category
        """
        invoices = db.query(Invoice).filter(
            Invoice.settlement_id == settlement.id
        ).all()

        original_costs: dict[CostCategory, Decimal] = {}
        allocated_costs: dict[CostCategory, Decimal] = {}

        for invoice in invoices:
            if invoice.cost_category not in original_costs:
                original_costs[invoice.cost_category] = Decimal('0')
                allocated_costs[invoice.cost_category] = Decimal('0')

            original_costs[invoice.cost_category] += invoice.total_amount

            # Wenn allocation_percentage gesetzt, nur diesen Anteil verwenden
            if invoice.allocation_percentage is not None:
                amount = invoice.total_amount * invoice.allocation_percentage
            else:
                amount = invoice.total_amount

            allocated_costs[invoice.cost_category] += amount

        # Berechne gewichteten Durchschnitt der Invoice-Allocation pro Kategorie
        invoice_allocations: dict[CostCategory, Decimal] = {}
        for category in original_costs:
            if original_costs[category] > 0:
                invoice_allocations[category] = allocated_costs[category] / original_costs[category]
            else:
                invoice_allocations[category] = Decimal('1')

        return original_costs, allocated_costs, invoice_allocations

    def _get_tenant_for_period(
        self,
        unit: Unit,
        period_start: date,
        period_end: date
    ) -> Optional[Tenant]:
        """Finde den Mieter für den Abrechnungszeitraum"""
        for tenant in unit.tenants:
            # Mieter muss vor Ende des Zeitraums eingezogen sein
            if tenant.move_in_date > period_end:
                continue

            # Wenn ausgezogen, muss Auszug nach Beginn des Zeitraums sein
            if tenant.move_out_date and tenant.move_out_date < period_start:
                continue

            return tenant

        return None

    def _calculate_occupancy_days(
        self,
        tenant: Tenant,
        period_start: date,
        period_end: date
    ) -> int:
        """Berechne die Belegungstage im Abrechnungszeitraum"""
        # Effektiver Start: Später von Einzug und Periodenstart
        effective_start = max(tenant.move_in_date, period_start)

        # Effektives Ende: Früher von Auszug und Periodenende
        if tenant.move_out_date:
            effective_end = min(tenant.move_out_date, period_end)
        else:
            effective_end = period_end

        if effective_start > effective_end:
            return 0

        return (effective_end - effective_start).days + 1

    def _get_allocation(
        self,
        unit: Unit,
        category: CostCategory,
        property_obj: Property,
        db: Session
    ) -> 'AllocationInfo':
        """Hole oder berechne den Verteilerschlüssel"""
        # Prüfe ob spezifischer Verteilerschlüssel existiert
        allocation = db.query(UnitAllocation).filter(
            UnitAllocation.unit_id == unit.id,
            UnitAllocation.cost_category == category
        ).first()

        if allocation:
            return AllocationInfo(
                percentage=allocation.allocation_percentage,
                method=allocation.allocation_method
            )

        # Standard: Nach Wohnfläche
        percentage = unit.area_sqm / property_obj.total_area_sqm

        return AllocationInfo(
            percentage=percentage,
            method=AllocationMethod.WOHNFLAECHE
        )

    def _calculate_prepayments(
        self,
        tenant: Tenant,
        period_start: date,
        period_end: date
    ) -> Decimal:
        """Berechne die geleisteten Vorauszahlungen"""
        if not tenant.monthly_prepayment:
            return Decimal('0')

        # Belegungstage
        days = self._calculate_occupancy_days(tenant, period_start, period_end)

        # Monate (approximiert)
        months = Decimal(days) / Decimal('30.44')  # Durchschnittliche Tage pro Monat

        return (tenant.monthly_prepayment * months).quantize(
            Decimal('0.01'),
            rounding=ROUND_HALF_UP
        )


class AllocationInfo:
    """Hilfklasse für Verteilerschlüssel-Informationen"""

    def __init__(self, percentage: Decimal, method: AllocationMethod):
        self.percentage = percentage
        self.method = method
