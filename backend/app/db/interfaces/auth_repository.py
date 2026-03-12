"""
Interface — Auth Repository

User profile lookups, QR token management, worker sessions.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IAuthRepository(ABC):

    @abstractmethod
    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """Get business owner user profile with org context."""
        ...

    @abstractmethod
    async def create_qr_token(
        self, workgroup_id: str, contractor_id: str, token: str, expires_at: str
    ) -> dict:
        """Create a QR access token for a workgroup."""
        ...

    @abstractmethod
    async def validate_qr_token(self, token: str) -> Optional[dict]:
        """Validate a QR token. Returns workgroup + contractor context or None."""
        ...

    @abstractmethod
    async def deactivate_qr_token(self, workgroup_id: str) -> bool:
        """Deactivate QR tokens for a completed workgroup."""
        ...

    @abstractmethod
    async def expire_old_tokens(self) -> int:
        """Deactivate all expired QR tokens. Returns count expired."""
        ...

    @abstractmethod
    async def get_or_create_worker_session(
        self, contractor_id: str, first_name: str, last_name: str,
        phone: str, email: Optional[str] = None,
    ) -> dict:
        """Look up or create a self-identified worker. Returns worker record."""
        ...

    @abstractmethod
    async def update_worker_last_active(self, worker_id: str) -> None:
        """Update last_active_at timestamp."""
        ...
