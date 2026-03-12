"""
Interface — Checkin Repository
"""

from abc import ABC, abstractmethod
from typing import Optional


class ICheckinRepository(ABC):

    @abstractmethod
    async def create_checkin(self, data: dict) -> dict:
        """Record a GPS check-in."""
        ...

    @abstractmethod
    async def checkout(self, checkin_id: str) -> dict:
        """Record check-out time."""
        ...

    @abstractmethod
    async def get_by_workgroup(
        self, workgroup_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict]: ...

    @abstractmethod
    async def get_by_worksite(
        self, worksite_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict]: ...

    @abstractmethod
    async def get_today_by_worksite(self, worksite_id: str) -> list[dict]:
        """Today's check-ins for a worksite (dashboard widget)."""
        ...

    @abstractmethod
    async def get_stale_sessions(self, max_hours: int = 10) -> list[dict]:
        """Find check-ins with no checkout older than max_hours."""
        ...

    @abstractmethod
    async def auto_checkout(self, checkin_ids: list[str], max_hours: int = 10) -> int:
        """Bulk auto-checkout stale sessions. Returns count updated."""
        ...

    @abstractmethod
    async def get_presence_summary(self, workgroup_id: str) -> dict:
        """Check-in count, unique workers, days on site for a workgroup."""
        ...
