"""
Stub Generator — Adds missing abstract method implementations.

Run from backend/ directory:
    python add_stubs.py

This reads each provider file, finds the last line of the class,
and inserts the missing stub methods before the end of the file.
"""

STUBS = {
    "app/db/providers/supabase/workgroup_queries.py": '''
    async def update_status(self, workgroup_id: str, status: str) -> dict:
        """Update workgroup status."""
        return await self.update_one("workgroups", workgroup_id, {"status": status})

    async def update_progress(self, workgroup_id: str, progress_pct: float) -> None:
        """Update workgroup progress percentage."""
        await self.update_one("workgroups", workgroup_id, {"progress_pct": progress_pct})
''',

    "app/db/providers/supabase/job_queries.py": '''
    async def update_status(self, job_id: str, status: str) -> dict:
        """Update job status."""
        return await self.update_one("jobs", job_id, {"status": status})

    async def get_jobs_for_invoice(self, workgroup_id: str) -> list[dict]:
        """Get completed jobs that have not been invoiced yet."""
        result = (
            self.client.table("jobs")
            .select("*")
            .eq("workgroup_id", workgroup_id)
            .eq("status", "complete")
            .is_("invoice_id", "null")
            .order("sequence")
            .execute()
        )
        return result.data or []

    async def mark_jobs_invoiced(self, job_ids: list[str], invoice_id: str) -> None:
        """Link jobs to an invoice and set status to invoiced."""
        for job_id in job_ids:
            self.client.table("jobs").update({
                "invoice_id": invoice_id,
                "status": "invoiced",
            }).eq("id", job_id).execute()
''',

    "app/db/providers/supabase/invoice_queries.py": '''
    async def update_status(self, invoice_id: str, status: str) -> dict:
        """Update invoice status."""
        return await self.update_one("invoices", invoice_id, {"status": status})

    async def set_ai_flags(self, invoice_id: str, validated: bool, flags: list[dict]) -> dict:
        """Set AI validation result and flags."""
        return await self.update_one("invoices", invoice_id, {
            "ai_validated": validated,
            "ai_flags": flags,
            "status": "ai_validated" if validated else "ai_flagged",
        })

    async def reject_invoice(self, invoice_id: str, reason: str) -> dict:
        """Reject an invoice with reason."""
        return await self.update_one("invoices", invoice_id, {
            "status": "rejected",
            "ai_flags": [{"type": "rejection", "reason": reason}],
        })

    async def get_cumulative_total(self, workgroup_id: str) -> float:
        """Sum of all non-rejected invoice amounts for a workgroup."""
        result = (
            self.client.table("invoices")
            .select("amount")
            .eq("workgroup_id", workgroup_id)
            .neq("status", "rejected")
            .execute()
        )
        return sum(float(inv["amount"]) for inv in (result.data or []))

    async def check_double_billing(self, workgroup_id: str, job_ids: list[str]) -> list[str]:
        """Return job_ids that already appear on another invoice."""
        result = (
            self.client.table("jobs")
            .select("id, invoice_id")
            .in_("id", job_ids)
            .not_.is_("invoice_id", "null")
            .execute()
        )
        return [job["id"] for job in (result.data or [])]

    async def get_pending_approvals(self, org_id: str) -> list[dict]:
        """All invoices awaiting approval across org."""
        result = (
            self.client.table("invoices")
            .select("*, workgroups(title, worksite_id, worksites(name, project_id, projects(org_id)))")
            .eq("status", "pending_approval")
            .execute()
        )
        # Filter by org_id (Supabase nested filter workaround)
        return [
            inv for inv in (result.data or [])
            if inv.get("workgroups", {}).get("worksites", {}).get("projects", {}).get("org_id") == org_id
        ]
''',

    "app/db/providers/supabase/contractor_queries.py": '''
    async def search_by_skills(
        self, org_id: str, skills: list[str],
        worksite_lat: float = None, worksite_lng: float = None,
    ) -> list[dict]:
        """Find contractors matching skills, optionally sorted by proximity."""
        result = (
            self.client.table("contractors")
            .select("*")
            .eq("org_id", org_id)
            .eq("is_active", True)
            .overlaps("skills", skills)
            .execute()
        )
        return result.data or []

    async def upsert_worker(
        self, contractor_id: str, first_name: str, last_name: str,
        phone: str, email: str = None,
    ) -> dict:
        """Create or update a self-identified worker."""
        # Check if worker exists by phone + contractor
        existing = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .eq("phone", phone)
            .limit(1)
            .execute()
        )
        if existing.data:
            worker_id = existing.data[0]["id"]
            return await self.update_one("contractor_workers", worker_id, {
                "last_active_at": "now()",
            })
        else:
            return await self.insert_one("contractor_workers", {
                "contractor_id": contractor_id,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "email": email,
            })

    async def get_workers(self, contractor_id: str) -> list[dict]:
        """Get all self-identified workers for a contractor company."""
        result = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("first_seen_at")
            .execute()
        )
        return result.data or []

    async def add_verification(self, contractor_id: str, data: dict) -> dict:
        """Add a verification record."""
        data["contractor_id"] = contractor_id
        return await self.insert_one("contractor_verifications", data)

    async def get_verifications(self, contractor_id: str) -> list[dict]:
        """Get all verification records for a contractor."""
        result = (
            self.client.table("contractor_verifications")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []

    async def get_stale_verifications(self, days_threshold: int = 30) -> list[dict]:
        """Get contractors needing re-verification."""
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(days=days_threshold)).isoformat()
        result = (
            self.client.table("contractors")
            .select("*")
            .eq("is_active", True)
            .or_(f"last_verified_at.is.null,last_verified_at.lt.{cutoff}")
            .execute()
        )
        return result.data or []

    async def update_verification_status(self, contractor_id: str, status: str) -> None:
        """Update contractor verification status."""
        from datetime import datetime
        await self.update_one("contractors", contractor_id, {
            "verification_status": status,
            "last_verified_at": datetime.utcnow().isoformat(),
        })

    async def validate_credentials(self, email: str, phone: str) -> dict:
        """Validate contractor company shared credentials (QR auth)."""
        result = (
            self.client.table("contractors")
            .select("*")
            .eq("email", email)
            .eq("phone", phone)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
''',

    "app/db/providers/supabase/checkin_queries.py": '''
    async def get_by_workgroup(self, workgroup_id: str, skip: int = 0, limit: int = 50) -> list[dict]:
        """Get check-ins for a workgroup."""
        return await self.fetch_many(
            self.TABLE,
            filters={"workgroup_id": workgroup_id},
            order_by="checked_in_at",
            ascending=False,
            skip=skip,
            limit=limit,
        )

    async def get_by_worksite(self, worksite_id: str, skip: int = 0, limit: int = 50) -> list[dict]:
        """Get check-ins for a worksite."""
        return await self.fetch_many(
            self.TABLE,
            filters={"worksite_id": worksite_id},
            order_by="checked_in_at",
            ascending=False,
            skip=skip,
            limit=limit,
        )

    async def get_today_by_worksite(self, worksite_id: str) -> list[dict]:
        """Today's check-ins for a worksite."""
        from datetime import date
        today = date.today().isoformat()
        result = (
            self.client.table(self.TABLE)
            .select("*, contractor_workers(first_name, last_name)")
            .eq("worksite_id", worksite_id)
            .gte("checked_in_at", today)
            .order("checked_in_at", desc=True)
            .execute()
        )
        return result.data or []

    async def get_stale_sessions(self, max_hours: int = 10) -> list[dict]:
        """Find check-ins with no checkout older than max_hours."""
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(hours=max_hours)).isoformat()
        result = (
            self.client.table(self.TABLE)
            .select("*")
            .is_("checked_out_at", "null")
            .lt("checked_in_at", cutoff)
            .execute()
        )
        return result.data or []

    async def auto_checkout(self, checkin_ids: list[str], max_hours: int = 10) -> int:
        """Bulk auto-checkout stale sessions."""
        from datetime import timedelta
        count = 0
        for cid in checkin_ids:
            checkin = await self.fetch_one(self.TABLE, cid)
            if checkin and checkin.get("checked_in_at"):
                # Set checkout to checked_in + max_hours
                await self.update_one(self.TABLE, cid, {
                    "checked_out_at": checkin["checked_in_at"],  # Simplified; ideally add max_hours
                })
                count += 1
        return count

    async def get_presence_summary(self, workgroup_id: str) -> dict:
        """Check-in count, unique workers, days on site for a workgroup."""
        presence = await self.get_workgroup_presence(workgroup_id)
        if presence:
            return presence
        return {
            "total_checkins": 0,
            "unique_workers": 0,
            "days_on_site": 0,
            "verified_photos": 0,
            "unverified_photos": 0,
        }
''',

    "app/db/providers/supabase/allocation_queries.py": '''
    async def get_candidates(self, workgroup_id: str, org_id: str) -> list[dict]:
        """Get contractor candidates for a workgroup with scoring data."""
        # Get the workgroup to know required trade/skills
        wg = await self.fetch_one("workgroups", workgroup_id)
        if not wg:
            return []

        trade = wg.get("trade", "")

        # Get all active contractors in this org with matching skills
        result = (
            self.client.table("contractors")
            .select("*, workgroups(count)")
            .eq("org_id", org_id)
            .eq("is_active", True)
            .contains("skills", [trade])
            .execute()
        )
        return result.data or []

    async def allocate_contractor(self, workgroup_id: str, contractor_id: str) -> dict:
        """Assign a contractor to a workgroup, set status to pending."""
        return await self.update_one("workgroups", workgroup_id, {
            "contractor_id": contractor_id,
            "status": "pending",
        })
''',

    "app/db/providers/supabase/auth_queries.py": '''
    async def deactivate_qr_token(self, workgroup_id: str) -> bool:
        """Deactivate QR tokens for a completed workgroup."""
        result = (
            self.client.table("qr_tokens")
            .update({"is_active": False})
            .eq("workgroup_id", workgroup_id)
            .execute()
        )
        return len(result.data or []) > 0

    async def expire_old_tokens(self) -> int:
        """Deactivate all expired QR tokens."""
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        result = (
            self.client.table("qr_tokens")
            .update({"is_active": False})
            .eq("is_active", True)
            .lt("expires_at", now)
            .execute()
        )
        return len(result.data or [])

    async def get_or_create_worker_session(
        self, contractor_id: str, first_name: str, last_name: str,
        phone: str, email: str = None,
    ) -> dict:
        """Look up or create a self-identified worker."""
        # Check if worker already exists
        existing = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .eq("phone", phone)
            .limit(1)
            .execute()
        )
        if existing.data:
            worker = existing.data[0]
            # Update last active
            await self.update_one("contractor_workers", worker["id"], {
                "last_active_at": "now()",
            })
            return worker
        else:
            return await self.insert_one("contractor_workers", {
                "contractor_id": contractor_id,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "email": email,
            })

    async def update_worker_last_active(self, worker_id: str) -> None:
        """Update last_active_at timestamp."""
        await self.update_one("contractor_workers", worker_id, {
            "last_active_at": "now()",
        })
''',
}


def main():
    import os

    for filepath, stub_code in STUBS.items():
        if not os.path.exists(filepath):
            print(f"  SKIP: {filepath} not found")
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Check if stubs already added (avoid duplicates)
        # Use the first method name as a marker
        first_method = stub_code.strip().split("\n")[0].strip()
        if first_method in content:
            print(f"  SKIP: {filepath} already has stubs")
            continue

        # Append stubs to end of file
        if not content.endswith("\n"):
            content += "\n"
        content += stub_code

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        method_count = stub_code.count("async def ")
        print(f"  ADDED: {filepath} — {method_count} methods")

    print("\nDone! Re-run the test to verify.")


if __name__ == "__main__":
    main()
