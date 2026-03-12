"""
Interface — Allocation Repository

AI contractor scoring and allocation queries.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IAllocationRepository(ABC):

    @abstractmethod
    async def get_candidates(
        self, workgroup_id: str, org_id: str
    ) -> list[dict]:
        """
        Get contractor candidates for a workgroup with scoring data:
        skills match, past performance, availability, proximity, pricing.
        """
        ...

    @abstractmethod
    async def allocate_contractor(
        self, workgroup_id: str, contractor_id: str
    ) -> dict:
        """Assign a contractor to a workgroup, set status to pending."""
        ...

    @abstractmethod
    async def get_contractor_workload(self, contractor_id: str) -> dict:
        """Current active workgroup count and capacity for a contractor."""
        ...

    @abstractmethod
    async def get_contractor_performance(self, contractor_id: str) -> dict:
        """Avg rating, completion rate, on-time percentage."""
        ...
