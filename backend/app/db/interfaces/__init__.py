"""
Database Repository Interfaces

Abstract base classes defining all data access contracts.
Import from here — never import from a specific provider.
"""

from app.db.interfaces.project_repository import IProjectRepository
from app.db.interfaces.worksite_repository import IWorksiteRepository
from app.db.interfaces.workgroup_repository import IWorkgroupRepository
from app.db.interfaces.job_repository import IJobRepository
from app.db.interfaces.invoice_repository import IInvoiceRepository
from app.db.interfaces.contractor_repository import IContractorRepository
from app.db.interfaces.checkin_repository import ICheckinRepository
from app.db.interfaces.dashboard_repository import IDashboardRepository
from app.db.interfaces.allocation_repository import IAllocationRepository
from app.db.interfaces.auth_repository import IAuthRepository
from app.db.interfaces.template_repository import ITemplateRepository
from app.db.interfaces.location_repository import ILocationRepository
from app.db.interfaces.business_profile_repository import IBusinessProfileRepository

__all__ = [
    "IProjectRepository",
    "IWorksiteRepository",
    "IWorkgroupRepository",
    "IJobRepository",
    "IInvoiceRepository",
    "IContractorRepository",
    "ICheckinRepository",
    "IDashboardRepository",
    "IAllocationRepository",
    "IAuthRepository",
    "ITemplateRepository",
    "ILocationRepository",
    "IBusinessProfileRepository",
]
