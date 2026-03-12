"""
Interface — Job Repository
"""

from abc import ABC, abstractmethod
from typing import Optional


class IJobRepository(ABC):

    @abstractmethod
    async def list_jobs(
        self, workgroup_id: str, status: Optional[str] = None
    ) -> list[dict]: ...

    @abstractmethod
    async def create_job(self, data: dict) -> dict: ...

    @abstractmethod
    async def get_job(self, job_id: str) -> Optional[dict]: ...

    @abstractmethod
    async def update_job(self, job_id: str, data: dict) -> dict: ...

    @abstractmethod
    async def update_status(self, job_id: str, status: str) -> dict: ...

    @abstractmethod
    async def delete_job(self, job_id: str) -> bool: ...

    @abstractmethod
    async def get_checklist(self, job_id: str) -> Optional[dict]: ...

    @abstractmethod
    async def update_checklist(self, job_id: str, items: list) -> dict: ...

    @abstractmethod
    async def get_jobs_for_invoice(self, workgroup_id: str) -> list[dict]:
        """Get completed jobs that haven't been invoiced yet."""
        ...

    @abstractmethod
    async def mark_jobs_invoiced(self, job_ids: list[str], invoice_id: str) -> None:
        """Link jobs to an invoice."""
        ...
