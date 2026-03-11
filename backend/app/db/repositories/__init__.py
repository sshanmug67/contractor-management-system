"""
Database Repositories

Query-oriented repositories organized by API need, not by table.
Each repository may query across multiple tables.
"""

from app.db.repositories.base_repository import BaseRepository
from app.db.repositories.project_queries import ProjectRepository
from app.db.repositories.worksite_queries import WorksiteRepository
from app.db.repositories.workgroup_queries import WorkgroupRepository
from app.db.repositories.job_queries import JobRepository
from app.db.repositories.invoice_queries import InvoiceRepository
from app.db.repositories.contractor_queries import ContractorRepository
from app.db.repositories.checkin_queries import CheckinRepository
from app.db.repositories.dashboard_queries import DashboardRepository
from app.db.repositories.allocation_queries import AllocationRepository
from app.db.repositories.auth_queries import AuthRepository

__all__ = [
    "BaseRepository",
    "ProjectRepository",
    "WorksiteRepository",
    "WorkgroupRepository",
    "JobRepository",
    "InvoiceRepository",
    "ContractorRepository",
    "CheckinRepository",
    "DashboardRepository",
    "AllocationRepository",
    "AuthRepository",
]
