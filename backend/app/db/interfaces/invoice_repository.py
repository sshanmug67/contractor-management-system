"""
Interface — Invoice Repository
"""

from abc import ABC, abstractmethod
from typing import Optional


class IInvoiceRepository(ABC):

    @abstractmethod
    async def list_invoices(
        self,
        workgroup_id: Optional[str] = None,
        contractor_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[dict]: ...

    @abstractmethod
    async def create_invoice(self, data: dict) -> dict: ...

    @abstractmethod
    async def get_invoice(self, invoice_id: str) -> Optional[dict]: ...

    @abstractmethod
    async def update_status(self, invoice_id: str, status: str) -> dict: ...

    @abstractmethod
    async def set_ai_flags(
        self, invoice_id: str, validated: bool, flags: list[dict]
    ) -> dict:
        """Set AI validation result and flags."""
        ...

    @abstractmethod
    async def approve_invoice(
        self, invoice_id: str, approved_by: str
    ) -> dict: ...

    @abstractmethod
    async def reject_invoice(self, invoice_id: str, reason: str) -> dict: ...

    @abstractmethod
    async def get_cumulative_total(self, workgroup_id: str) -> float:
        """Sum of all non-rejected invoice amounts for a workgroup."""
        ...

    @abstractmethod
    async def check_double_billing(
        self, workgroup_id: str, job_ids: list[str]
    ) -> list[str]:
        """Return job_ids that already appear on another invoice."""
        ...

    @abstractmethod
    async def get_pending_approvals(self, org_id: str) -> list[dict]:
        """All invoices awaiting approval across org."""
        ...
