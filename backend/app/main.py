"""
CMS Backend — FastAPI Application Entry Point

Contractor Management System API.
Architecture: Project → Worksite → Workgroup → Job
"""

from app.config.logging_config import setup_logging, shutdown_logging

# Initialize logging BEFORE get_settings()
setup_logging(log_file_name="cms")


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    projects,
    worksites,
    workgroups,
    jobs,
    invoices,
    contractors,
    employees,
    messages,
    uploads,
    checkins,
    analytics,
    dashboard,
    locations,
)
from app.auth import router as auth_router
from app.routers import dependency_changes
from app.routers import scaffold as scaffold_router_mod    # ★ NEW
from app.routers import templates as templates_router_mod  # ★ NEW

import logging
_log = logging.getLogger("app.main")

settings = get_settings()
_log.info("✅ Settings loaded. Environment: %s", settings.app_env)
_log.info("   Claude API key: %s", "SET (ends ..." + settings.claude_api_key[-6:] + ")" if settings.claude_api_key else "⚠️ NOT SET")

app = FastAPI(
    title="Contractor Management System",
    description="AI-powered contractor management: Project → Worksite → Workgroup → Job",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────
# ★ Scaffold router MUST be registered BEFORE projects router.
# Both share /api/projects prefix. scaffold has specific paths like
# /api/projects/scaffold and /api/projects/quick-starts that would
# otherwise be caught by projects' GET /{project_id} catch-all.
app.include_router(scaffold_router_mod.router)  # ★ NEW — has own prefix /api/projects
app.include_router(templates_router_mod.router) # ★ NEW — has own prefix /api/templates
_log.info("✅ Scaffold router registered (prefix=%s)", scaffold_router_mod.router.prefix)
_log.info("✅ Templates router registered (prefix=%s)", templates_router_mod.router.prefix)

app.include_router(auth_router.router,      prefix="/api/auth",        tags=["Auth"])
app.include_router(projects.router,         prefix="/api/projects",    tags=["Projects"])
app.include_router(worksites.router,        prefix="/api/worksites",   tags=["Worksites"])
app.include_router(workgroups.router,       prefix="/api/workgroups",  tags=["Workgroups"])
app.include_router(jobs.router,             prefix="/api/jobs",        tags=["Jobs"])
app.include_router(invoices.router,         prefix="/api/invoices",    tags=["Invoices"])
app.include_router(contractors.router,      prefix="/api/contractors", tags=["Contractors"])
app.include_router(employees.router,        prefix="/api/employees",   tags=["Employees"])
app.include_router(messages.router,         prefix="/api/messages",    tags=["Messages"])
app.include_router(uploads.router,          prefix="/api/uploads",     tags=["Uploads"])
app.include_router(checkins.router,         prefix="/api/checkins",    tags=["Check-ins"])
app.include_router(analytics.router,        prefix="/api/analytics",   tags=["Analytics"])
app.include_router(dashboard.router,        prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(locations.router,        prefix="/api/locations",   tags=["Locations"])
app.include_router(dependency_changes.router)

# ── Health Check ──────────────────────────────────────
@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "version": "0.1.0",
        "environment": settings.app_env,
    }


# ── Startup / Shutdown ────────────────────────────────
@app.on_event("startup")
async def on_startup():
    """Initialize connections, verify Supabase, etc."""
    _log.info("=" * 60)
    _log.info("CMS Backend — Startup complete")
    _log.info("=" * 60)
    # Log scaffold-related routes
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            if any(kw in route.path for kw in ['scaffold', 'template', 'quick-start']):
                _log.info("  📌 %s %s", list(route.methods), route.path)
    # API key check
    if settings.claude_api_key:
        _log.info("  ✅ Claude API key ready (ends ...%s)", settings.claude_api_key[-6:])
    else:
        _log.warning("  ⚠️ CLAUDE_API_KEY not set — scaffold generation will fail!")
    if settings.google_maps_api_key:
        _log.info("  ✅ Google Maps API key ready — geocoding/verification enabled")
    else:
        _log.warning("  ⚠️ GOOGLE_MAPS_API_KEY not set — geocoding disabled (geofence still works)")
    _log.info("=" * 60)


@app.on_event("shutdown")
async def on_shutdown():
    shutdown_logging()