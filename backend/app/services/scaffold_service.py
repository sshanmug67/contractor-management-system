"""
Service — Scaffold Service

Pure service that generates project skeletons via the Anthropic Claude API.
Handles generation, refinement, and validation.

GOLDEN RULE: This is a pure service. It calls the Claude API and validates
the response. It does NOT touch the database, Redis, or Celery.

File: app/services/scaffold_service.py
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

import httpx

from app.config import get_settings
from app.models.project_settings import (
    ScaffoldRequest,
    ScaffoldResponse,
    ScaffoldWorksite,
    ScaffoldWorkgroup,
    ScaffoldJob,
    RefineRequest,
)
from app.prompts.scaffold_prompts import (
    build_scaffold_prompt,
    build_refine_prompt,
)

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────

CLAUDE_MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 4096
TEMPERATURE = 0.3  # Low temp for structured output consistency
MAX_RETRIES = 1


# ═══════════════════════════════════════════════════════════
# SCAFFOLD SERVICE
# ═══════════════════════════════════════════════════════════


class ScaffoldService:
    """
    Generates and validates project skeletons via Claude API.

    Usage:
        service = ScaffoldService()
        scaffold = await service.generate(request)
        refined = await service.refine(refine_request)
    """

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.claude_api_key
        self.api_url = "https://api.anthropic.com/v1/messages"
        logger.info("[ScaffoldService] Initialized — API key present: %s, key ends: ...%s",
                     bool(self.api_key), self.api_key[-6:] if self.api_key else "EMPTY")

    # ── Generate ──────────────────────────────────────────

    async def generate(self, request: ScaffoldRequest) -> ScaffoldResponse:
        """
        Generate a project scaffold from a natural language description.

        Flow:
            1. Build system prompt with context
            2. Call Claude API
            3. Parse JSON response
            4. Validate (schema, cycles, budgets)
            5. On failure: retry once with error feedback
            6. Return validated ScaffoldResponse

        Args:
            request: ScaffoldRequest with description, project_type, etc.

        Returns:
            ScaffoldResponse with workgroups, jobs, dependencies

        Raises:
            ValueError: if generation fails after retries
        """
        logger.info("=" * 50)
        logger.info("[GENERATE] Starting scaffold generation")
        logger.info("  description: %.80s...", request.description)
        logger.info("  project_type: %s", request.project_type)
        logger.info("  industry: %s", request.industry)
        logger.info("  budget: %s", request.budget)
        logger.info("  timeline_months: %s", request.timeline_months)
        logger.info("  num_worksites: %s", request.num_worksites)

        try:
            system_prompt, user_message = build_scaffold_prompt(
                description=request.description,
                project_type=request.project_type.value,
                industry=request.industry,
                budget=float(request.budget) if request.budget else None,
                timeline_months=request.timeline_months,
                num_worksites=request.num_worksites,
            )
            logger.info("  ✅ Prompt built — system=%d chars, user=%d chars", len(system_prompt), len(user_message))
        except Exception as e:
            logger.error("  ❌ Prompt build failed: %s", e, exc_info=True)
            raise

        # First attempt
        logger.info("  Calling Claude API (attempt 1)...")
        raw_json = await self._call_claude(system_prompt, user_message)
        logger.info("  ✅ Claude responded — %d chars", len(raw_json))
        logger.info("  Response preview: %.200s", raw_json)
        scaffold, errors = self._parse_and_validate(raw_json)
        logger.info("  Validation: scaffold=%s, errors=%s", scaffold is not None, errors)

        if scaffold:
            return scaffold

        # Retry with error feedback
        if errors and MAX_RETRIES > 0:
            logger.warning(f"Scaffold generation failed, retrying: {errors}")
            retry_message = (
                f"{user_message}\n\n"
                f"IMPORTANT: Your previous response had these errors: {'; '.join(errors)}. "
                f"Please fix them and return valid JSON."
            )
            raw_json = await self._call_claude(system_prompt, retry_message)
            scaffold, errors = self._parse_and_validate(raw_json)

            if scaffold:
                return scaffold

        raise ValueError(f"Scaffold generation failed: {'; '.join(errors or ['Unknown error'])}")

    # ── Refine ────────────────────────────────────────────

    async def refine(self, request: RefineRequest) -> ScaffoldResponse:
        """
        Refine an existing scaffold based on user feedback.

        The current scaffold is sent as context, and Claude modifies
        it based on the user's feedback (e.g., "add a permits phase",
        "split electrical into two phases").

        Returns the complete modified scaffold (not a diff).
        """
        current_json = request.current_scaffold.model_dump_json()
        system_prompt, user_message = build_refine_prompt(
            current_scaffold_json=current_json,
            feedback=request.feedback,
        )

        raw_json = await self._call_claude(system_prompt, user_message)
        scaffold, errors = self._parse_and_validate(raw_json)

        if scaffold:
            return scaffold

        raise ValueError(f"Scaffold refinement failed: {'; '.join(errors or ['Unknown error'])}")

    # ── Claude API Call ───────────────────────────────────

    async def _call_claude(self, system_prompt: str, user_message: str) -> str:
        """
        Call the Anthropic Messages API and return the raw text response.
        Uses httpx async client for non-blocking HTTP.
        """
        logger.info("  [_call_claude] Preparing request...")
        logger.info("    URL: %s", self.api_url)
        logger.info("    Model: %s", CLAUDE_MODEL)
        logger.info("    API key present: %s (ends ...%s)", bool(self.api_key), self.api_key[-6:] if self.api_key else "EMPTY")

        if not self.api_key:
            logger.error("    ⛔ CLAUDE_API_KEY is empty! Set it in .env or environment.")
            raise ValueError("CLAUDE_API_KEY not configured — set it in your .env file")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        payload = {
            "model": CLAUDE_MODEL,
            "max_tokens": MAX_TOKENS,
            "temperature": TEMPERATURE,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_message}
            ],
        }

        try:
            logger.info("    Sending POST to %s ...", self.api_url)
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                )

            logger.info("    Response status: %d", response.status_code)

            if response.status_code != 200:
                body = response.text[:500]
                logger.error("    ❌ Claude API error %d: %s", response.status_code, body)
                raise ValueError(f"Claude API error {response.status_code}: {body}")

            data = response.json()
            logger.info("    ✅ Response parsed — keys: %s", list(data.keys()))
            logger.info("    Usage: %s", data.get("usage", {}))

        except httpx.ConnectError as e:
            logger.error("    ⛔ Connection to Claude API failed: %s", e)
            raise ValueError(f"Cannot connect to Claude API: {e}")
        except httpx.TimeoutException as e:
            logger.error("    ⛔ Claude API timeout after 30s: %s", e)
            raise ValueError(f"Claude API timeout: {e}")
        except ValueError:
            raise  # Re-raise our own ValueErrors
        except Exception as e:
            logger.error("    ⛔ Unexpected error: %s (%s)", e, type(e).__name__, exc_info=True)
            raise ValueError(f"Claude API call failed: {type(e).__name__}: {e}")

        # Extract text from response
        content = data.get("content", [])
        text_parts = [
            block["text"]
            for block in content
            if block.get("type") == "text"
        ]

        return "\n".join(text_parts)

    # ── Parse & Validate ──────────────────────────────────

    def _parse_and_validate(self, raw_text: str) -> tuple[Optional[ScaffoldResponse], list[str]]:
        """Parse JSON from Claude's response and validate the scaffold."""
        errors = []
        logger.info("  [_parse_and_validate] Input length: %d", len(raw_text))

        # Strip markdown fences if present
        cleaned = raw_text.strip()
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)

        # Parse JSON
        try:
            data = json.loads(cleaned)
            logger.info("  ✅ JSON parsed — keys: %s", list(data.keys()))
        except json.JSONDecodeError as e:
            logger.error("  ❌ JSON parse failed: %s", str(e)[:100])
            logger.error("  Raw text (first 300 chars): %s", cleaned[:300])
            return None, [f"Invalid JSON: {str(e)[:100]}"]

        # Validate required keys
        if not isinstance(data.get("workgroups"), list) or len(data["workgroups"]) == 0:
            errors.append("Must have at least 1 workgroup")

        if not isinstance(data.get("jobs"), list) or len(data["jobs"]) == 0:
            errors.append("Must have at least 1 job")

        if errors:
            return None, errors

        # Parse into Pydantic models
        try:
            worksites = [ScaffoldWorksite(**ws) for ws in data.get("worksites", [{"name": "Main Site"}])]
            workgroups = [ScaffoldWorkgroup(**wg) for wg in data["workgroups"]]
            jobs = [ScaffoldJob(**j) for j in data["jobs"]]
        except Exception as e:
            return None, [f"Schema validation failed: {str(e)[:200]}"]

        # Validate workgroup indices in jobs
        wg_count = len(workgroups)
        for i, job in enumerate(jobs):
            if job.workgroup_index < 0 or job.workgroup_index >= wg_count:
                errors.append(f"Job '{job.title}' references invalid workgroup_index={job.workgroup_index}")

        # Validate dependency indices
        for i, wg in enumerate(workgroups):
            for dep_idx in wg.depends_on_indices:
                if dep_idx < 0 or dep_idx >= wg_count:
                    errors.append(f"WG '{wg.title}' depends_on invalid index={dep_idx}")
                if dep_idx == i:
                    errors.append(f"WG '{wg.title}' depends on itself")

        # Validate no circular dependencies (simple DFS)
        cycle_error = self._detect_cycles(workgroups)
        if cycle_error:
            errors.append(cycle_error)

        # Validate durations
        for job in jobs:
            if job.est_duration_days < 1:
                errors.append(f"Job '{job.title}' has invalid duration: {job.est_duration_days}")

        # Validate each WG has at least 1 job
        wg_job_counts = {}
        for job in jobs:
            wg_job_counts[job.workgroup_index] = wg_job_counts.get(job.workgroup_index, 0) + 1
        for i, wg in enumerate(workgroups):
            if wg_job_counts.get(i, 0) == 0:
                errors.append(f"WG '{wg.title}' has no jobs")

        if errors:
            return None, errors

        # Build response
        scaffold = ScaffoldResponse(
            worksites=worksites,
            workgroups=workgroups,
            jobs=jobs,
            summary=data.get("summary", ""),
            estimated_duration_days=data.get("estimated_duration_days", 0),
            trade_count=len(set(wg.trade for wg in workgroups if wg.trade)),
        )

        return scaffold, []

    # ── Cycle Detection ───────────────────────────────────

    @staticmethod
    def _detect_cycles(workgroups: list[ScaffoldWorkgroup]) -> Optional[str]:
        """
        Simple DFS cycle detection on workgroup dependency graph.
        Returns error string if cycle found, None otherwise.
        """
        n = len(workgroups)
        adj: dict[int, list[int]] = {i: [] for i in range(n)}
        for i, wg in enumerate(workgroups):
            for dep_idx in wg.depends_on_indices:
                if 0 <= dep_idx < n:
                    adj[dep_idx].append(i)  # dep_idx → i (dep must finish before i starts)

        WHITE, GRAY, BLACK = 0, 1, 2
        color = [WHITE] * n

        def dfs(node: int) -> bool:
            color[node] = GRAY
            for neighbor in adj[node]:
                if color[neighbor] == GRAY:
                    return True  # back edge → cycle
                if color[neighbor] == WHITE and dfs(neighbor):
                    return True
            color[node] = BLACK
            return False

        for i in range(n):
            if color[i] == WHITE:
                if dfs(i):
                    return "Circular dependency detected in workgroup dependencies"

        return None
