"""
Router — Employees

CRUD for business employees (owner's staff, not contractors).
These are the people on the business side who manage projects.

Database access goes through ProviderRegistry.
TODO: Add IEmployeeRepository to app/db/interfaces/__init__.py
      and create get_employee_repo in dependencies.py,
      then update this router to use the typed dependency.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_providers
from app.providers import ProviderRegistry

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/")
async def list_employees(
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """List employees in the organization."""
    # TODO: providers.employees.list_by_org(org_id)
    return []


@router.post("/", status_code=201)
async def create_employee(
    data: dict,
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """Add an employee to the organization."""
    # TODO: providers.employees.create(org_id, data)
    pass


@router.get("/{employee_id}")
async def get_employee(
    employee_id: str,
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """Get employee detail."""
    # TODO: providers.employees.get_by_id(employee_id)
    pass


@router.patch("/{employee_id}")
async def update_employee(
    employee_id: str,
    updates: dict,
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """Update employee info."""
    # TODO: providers.employees.update(employee_id, updates)
    pass


@router.delete("/{employee_id}", status_code=204)
async def deactivate_employee(
    employee_id: str,
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """Deactivate an employee (soft delete)."""
    # TODO: providers.employees.deactivate(employee_id)
    pass
