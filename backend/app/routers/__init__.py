
"""
Router Registration

All API routers are imported and collected here.
The main app includes them via: for r in routers: app.include_router(r)

File: app/routers/__init__.py
"""

from app.routers.dashboard import router as dashboard_router
from app.routers.projects import router as projects_router
from app.routers.worksites import router as worksites_router
from app.routers.workgroups import router as workgroups_router
from app.routers.jobs import router as jobs_router
from app.routers.invoices import router as invoices_router
from app.routers.contractors import router as contractors_router
from app.routers.checkins import router as checkins_router
from app.routers.employees import router as employees_router
from app.routers.messages import router as messages_router
from app.routers.uploads import router as uploads_router
from app.routers.analytics import router as analytics_router
from app.routers.dependency_changes import router as dependency_changes_router
from app.routers.templates import router as templates_router      # ★ NEW
from app.routers.scaffold import router as scaffold_router        # ★ NEW

routers = [
    dashboard_router,
    projects_router,
    worksites_router,
    workgroups_router,
    jobs_router,
    invoices_router,
    contractors_router,
    checkins_router,
    employees_router,
    messages_router,
    uploads_router,
    analytics_router,
    dependency_changes_router,
    templates_router,       # ★ NEW — /api/templates/*
    scaffold_router,        # ★ NEW — /api/projects/scaffold, /create-from-*
]