"""
Router — Business Employees

CRUD for business employees (contact persons for worksites).
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.employee import (
    EmployeeCreate, EmployeeUpdate,
    EmployeeResponse, EmployeeDetail,
)

router = APIRouter()


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    is_active: Optional[bool] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List business employees in the organization."""
    return []


@router.post("/", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    employee: EmployeeCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Add a new business employee."""
    # TODO: Insert with org_id from user
    pass


@router.get("/{employee_id}", response_model=EmployeeDetail)
async def get_employee(
    employee_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get employee detail with worksite assignments."""
    pass


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    updates: EmployeeUpdate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update employee info."""
    pass


@router.delete("/{employee_id}", status_code=204)
async def deactivate_employee(
    employee_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Deactivate an employee (soft delete)."""
    # TODO: Check if employee is sole primary contact anywhere
    pass
