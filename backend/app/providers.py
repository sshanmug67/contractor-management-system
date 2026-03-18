"""
CMS Provider Registry — Central Dependency Injection

Selects concrete implementations based on DB_PROVIDER env var.
All repositories, storage, auth, and realtime providers are
initialized here and accessed via a single registry instance.

Changes from previous version:
  ✦ Added ITemplateRepository + SupabaseTemplateRepository for Template Library
  ✦ Added ILocationRepository + LocationRepository for Phase 4 (Business Locations + GeoService)

Usage:
    from app.providers import get_provider_registry
    registry = get_provider_registry()
    project = await registry.projects.get_project(id)
    templates = await registry.templates.list_templates(org_id)
    locations = await registry.locations.list_locations(org_id)
"""

from functools import lru_cache
from app.config import get_settings

# Import interfaces for type hints
from app.db.interfaces import (
    IProjectRepository,
    IWorksiteRepository,
    IWorkgroupRepository,
    IJobRepository,
    IInvoiceRepository,
    IContractorRepository,
    ICheckinRepository,
    IDashboardRepository,
    IAllocationRepository,
    IAuthRepository,
)
from app.db.interfaces.template_repository import ITemplateRepository
from app.db.interfaces.location_repository import ILocationRepository


class ProviderRegistry:
    """
    Singleton holding all provider instances.

    Attributes mirror the interface names for clean access:
        registry.projects    → IProjectRepository
        registry.worksites   → IWorksiteRepository
        registry.workgroups  → IWorkgroupRepository
        registry.jobs        → IJobRepository
        registry.invoices    → IInvoiceRepository
        registry.contractors → IContractorRepository
        registry.checkins    → ICheckinRepository
        registry.dashboard   → IDashboardRepository
        registry.allocation  → IAllocationRepository
        registry.auth        → IAuthRepository
        registry.templates   → ITemplateRepository  ★ NEW
        registry.locations   → ILocationRepository  ★ Phase 4
    """

    # ── Repository instances (set by provider init) ───────
    projects: IProjectRepository
    worksites: IWorksiteRepository
    workgroups: IWorkgroupRepository
    jobs: IJobRepository
    invoices: IInvoiceRepository
    contractors: IContractorRepository
    checkins: ICheckinRepository
    dashboard: IDashboardRepository
    allocation: IAllocationRepository
    auth: IAuthRepository
    templates: ITemplateRepository  # ★ NEW — Template Library
    locations: ILocationRepository  # ★ Phase 4 — Business Locations

    # TODO Phase B: Add these when storage/auth/realtime abstraction is built
    # storage: IStorageProvider
    # auth_provider: IAuthProvider
    # realtime: IRealtimeProvider

    def __init__(self):
        settings = get_settings()
        provider = getattr(settings, "db_provider", "supabase")

        if provider == "supabase":
            self._init_supabase(settings)
        elif provider == "postgres":
            self._init_postgres(settings)
        else:
            raise ValueError(
                f"Unknown DB_PROVIDER: '{provider}'. "
                f"Supported: 'supabase', 'postgres'"
            )

    def _init_supabase(self, settings):
        """Wire up Supabase provider implementations."""
        from supabase import create_client

        client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

        # Import Supabase-specific implementations
        from app.db.providers.supabase.project_queries import ProjectRepository
        from app.db.providers.supabase.worksite_queries import WorksiteRepository
        from app.db.providers.supabase.workgroup_queries import WorkgroupRepository
        from app.db.providers.supabase.job_queries import JobRepository
        from app.db.providers.supabase.invoice_queries import InvoiceRepository
        from app.db.providers.supabase.contractor_queries import ContractorRepository
        from app.db.providers.supabase.checkin_queries import CheckinRepository
        from app.db.providers.supabase.dashboard_queries import DashboardRepository
        from app.db.providers.supabase.allocation_queries import AllocationRepository
        from app.db.providers.supabase.auth_queries import AuthRepository
        from app.db.providers.supabase.template_queries import SupabaseTemplateRepository  # ★ NEW
        from app.db.providers.supabase.location_queries import LocationRepository  # ★ Phase 4

        self.projects = ProjectRepository(client)
        self.worksites = WorksiteRepository(client)
        self.workgroups = WorkgroupRepository(client)
        self.jobs = JobRepository(client)
        self.invoices = InvoiceRepository(client)
        self.contractors = ContractorRepository(client)
        self.checkins = CheckinRepository(client)
        self.dashboard = DashboardRepository(client)
        self.allocation = AllocationRepository(client)
        self.auth = AuthRepository(client)
        self.templates = SupabaseTemplateRepository(client)  # ★ NEW — Template Library
        self.locations = LocationRepository(client)  # ★ Phase 4 — Business Locations

    def _init_postgres(self, settings):
        """
        Wire up self-hosted PostgreSQL provider implementations.
        Phase B — implemented when first enterprise customer needs it.
        """
        raise NotImplementedError(
            "PostgreSQL (self-hosted) provider is planned for Phase B. "
            "Set DB_PROVIDER=supabase for now."
        )


@lru_cache()
def get_provider_registry() -> ProviderRegistry:
    """
    Get or create the singleton ProviderRegistry.
    Cached so it's only initialized once per process.
    """
    return ProviderRegistry()
