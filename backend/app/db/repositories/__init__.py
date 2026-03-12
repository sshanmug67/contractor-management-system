"""
Database Repositories — Re-export from provider.

This module maintains backward compatibility.
All repositories now live in app.db.providers.supabase.
New code should import from app.providers.get_provider_registry().
"""


def __getattr__(name):
    """Lazy import to avoid circular dependency."""
    from app.db.providers.supabase import (
        ProjectRepository,
        WorksiteRepository,
        WorkgroupRepository,
        JobRepository,
        InvoiceRepository,
        ContractorRepository,
        CheckinRepository,
        DashboardRepository,
        AllocationRepository,
        AuthRepository,
    )

    _map = {
        "ProjectRepository": ProjectRepository,
        "WorksiteRepository": WorksiteRepository,
        "WorkgroupRepository": WorkgroupRepository,
        "JobRepository": JobRepository,
        "InvoiceRepository": InvoiceRepository,
        "ContractorRepository": ContractorRepository,
        "CheckinRepository": CheckinRepository,
        "DashboardRepository": DashboardRepository,
        "AllocationRepository": AllocationRepository,
        "AuthRepository": AuthRepository,
    }

    if name in _map:
        return _map[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
