"""
Interface — Business Profile Repository

Abstract contract for business profile CRUD.
1:1 with organizations — each org has exactly one profile.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IBusinessProfileRepository(ABC):

    @abstractmethod
    async def get_by_org(self, org_id: str) -> Optional[dict]:
        """Get profile for an organization. Returns None if not created yet."""
        ...

    @abstractmethod
    async def create(self, org_id: str, data: dict) -> dict:
        """Create profile for an organization."""
        ...

    @abstractmethod
    async def update(self, org_id: str, data: dict) -> dict:
        """Update profile fields. Only non-None fields are written."""
        ...

    @abstractmethod
    async def update_onboarding(self, org_id: str, step: int, complete: bool) -> dict:
        """Update onboarding progress. Also syncs organizations.onboarding_complete."""
        ...

    @abstractmethod
    async def get_onboarding_status(self, org_id: str) -> dict:
        """Lightweight check: does profile exist, is onboarding done, what's missing."""
        ...
