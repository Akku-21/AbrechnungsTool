from fastapi import APIRouter

from app.api.v1.endpoints import properties, units, tenants, settlements, documents, invoices, manual_entries, settings

api_router = APIRouter()

api_router.include_router(properties.router, prefix="/properties", tags=["Properties"])
api_router.include_router(units.router, prefix="/units", tags=["Units"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(settlements.router, prefix="/settlements", tags=["Settlements"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(manual_entries.router, prefix="/manual-entries", tags=["Manual Entries"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
