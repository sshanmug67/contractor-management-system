"""
Supabase Provider — Business Profile Queries

Implements IBusinessProfileRepository against Supabase.
"""

import logging
from typing import Optional
from app.db.interfaces.business_profile_repository import IBusinessProfileRepository
from app.db.providers.supabase.base_repository import SupabaseBaseRepository

_log = logging.getLogger(__name__)


class BusinessProfileRepository(SupabaseBaseRepository, IBusinessProfileRepository):

    async def get_by_org(self, org_id: str) -> Optional[dict]:
        """Get profile for an organization."""
        try:
            result = (
                self.client.table("business_profiles")
                .select("*")
                .eq("org_id", org_id)
                .execute()
            )
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            _log.error("Failed to get business profile for org %s: %s", org_id, e)
            raise

    async def create(self, org_id: str, data: dict) -> dict:
        """Create profile for an organization."""
        try:
            payload = {**data, "org_id": org_id}
            result = (
                self.client.table("business_profiles")
                .insert(payload)
                .execute()
            )
            _log.info("Created business profile for org %s", org_id)
            return result.data[0]
        except Exception as e:
            _log.error("Failed to create business profile for org %s: %s", org_id, e)
            raise

    async def update(self, org_id: str, data: dict) -> dict:
        """Update profile fields. Only non-None fields are written."""
        try:
            # Filter out None values
            clean = {k: v for k, v in data.items() if v is not None}
            if not clean:
                return await self.get_by_org(org_id)

            result = (
                self.client.table("business_profiles")
                .update(clean)
                .eq("org_id", org_id)
                .execute()
            )
            _log.info("Updated business profile for org %s: %d fields", org_id, len(clean))
            return result.data[0]
        except Exception as e:
            _log.error("Failed to update business profile for org %s: %s", org_id, e)
            raise

    async def update_onboarding(self, org_id: str, step: int, complete: bool) -> dict:
        """Update onboarding progress. Syncs to organizations table."""
        try:
            # Update profile
            result = (
                self.client.table("business_profiles")
                .update({
                    "onboarding_step": step,
                    "onboarding_complete": complete,
                })
                .eq("org_id", org_id)
                .execute()
            )

            # Sync denormalized flag on organizations
            self.client.table("organizations").update({
                "onboarding_complete": complete,
            }).eq("id", org_id).execute()

            _log.info("Onboarding updated for org %s: step=%d complete=%s", org_id, step, complete)
            return result.data[0]
        except Exception as e:
            _log.error("Failed to update onboarding for org %s: %s", org_id, e)
            raise

    async def get_onboarding_status(self, org_id: str) -> dict:
        """Lightweight onboarding check for dashboard banner."""
        try:
            profile = await self.get_by_org(org_id)

            if not profile:
                return {
                    "has_profile": False,
                    "onboarding_complete": False,
                    "onboarding_step": 0,
                    "company_name": None,
                    "missing_fields": ["company_name", "address", "industry"],
                }

            missing = []
            if not profile.get("company_name"):
                missing.append("company_name")
            if not profile.get("address_line1"):
                missing.append("address")
            if not profile.get("industry"):
                missing.append("industry")
            if not profile.get("phone"):
                missing.append("phone")
            if not profile.get("email"):
                missing.append("email")

            return {
                "has_profile": True,
                "onboarding_complete": profile.get("onboarding_complete", False),
                "onboarding_step": profile.get("onboarding_step", 0),
                "company_name": profile.get("company_name"),
                "missing_fields": missing,
            }
        except Exception as e:
            _log.error("Failed to get onboarding status for org %s: %s", org_id, e)
            return {
                "has_profile": False,
                "onboarding_complete": False,
                "onboarding_step": 0,
                "company_name": None,
                "missing_fields": [],
            }
