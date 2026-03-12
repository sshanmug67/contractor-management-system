"""
Interface — Contractor Repository
"""

from abc import ABC, abstractmethod
from typing import Optional


class IContractorRepository(ABC):

    @abstractmethod
    async def list_contractors(
        self, org_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict]: ...

    @abstractmethod
    async def create_contractor(self, data: dict) -> dict: ...

    @abstractmethod
    async def get_contractor(self, contractor_id: str) -> Optional[dict]: ...

    @abstractmethod
    async def update_contractor(self, contractor_id: str, data: dict) -> dict: ...

    @abstractmethod
    async def search_by_skills(
        self, org_id: str, skills: list[str], worksite_lat: float = None,
        worksite_lng: float = None,
    ) -> list[dict]:
        """Find contractors matching skills, optionally sorted by proximity."""
        ...

    @abstractmethod
    async def upsert_worker(
        self, contractor_id: str, first_name: str, last_name: str,
        phone: str, email: Optional[str] = None,
    ) -> dict:
        """Create or update a self-identified worker."""
        ...

    @abstractmethod
    async def get_workers(self, contractor_id: str) -> list[dict]:
        """Get all self-identified workers for a contractor company."""
        ...

    @abstractmethod
    async def add_verification(self, contractor_id: str, data: dict) -> dict:
        """Add a verification record (license, insurance, BBB)."""
        ...

    @abstractmethod
    async def get_verifications(self, contractor_id: str) -> list[dict]:
        """Get all verification records for a contractor."""
        ...

    @abstractmethod
    async def get_stale_verifications(self, days_threshold: int = 30) -> list[dict]:
        """Get contractors needing re-verification."""
        ...

    @abstractmethod
    async def update_verification_status(
        self, contractor_id: str, status: str
    ) -> None: ...

    @abstractmethod
    async def validate_credentials(
        self, email: str, phone: str
    ) -> Optional[dict]:
        """Validate contractor company shared credentials (QR auth)."""
        ...
