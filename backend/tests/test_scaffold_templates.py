"""
CMS Backend Test — Project Settings, Templates & LLM Scaffolding

Tests all new endpoints in sequence:
  1. Health check
  2. Quick-starts list
  3. LLM scaffold generation (Kitchen Remodel)
  4. Create template from scaffold
  5. List templates
  6. Get template detail
  7. Update template
  8. Duplicate template
  9. Create project from template
  10. Create project from LLM scaffold directly
  11. Create template from existing project
  12. Archive template
  13. LLM scaffold refinement

Run: python test_scaffold_templates.py
Requires: server running on http://127.0.0.1:8010
"""

import httpx
import json
import sys
import time

BASE = "http://127.0.0.1:8010"
PASS = "✅"
FAIL = "❌"
SKIP = "⏭️"

results = []
stored = {}  # Store IDs across tests


def log(test_name, passed, detail=""):
    status = PASS if passed else FAIL
    results.append((test_name, passed))
    print(f"  {status} {test_name}" + (f" — {detail}" if detail else ""))


def section(title):
    print(f"\n{'═' * 60}")
    print(f"  {title}")
    print(f"{'═' * 60}")


# ═══════════════════════════════════════════════════════════
# TESTS
# ═══════════════════════════════════════════════════════════

def test_health():
    """Basic connectivity check."""
    section("1. Health Check")
    try:
        r = httpx.get(f"{BASE}/api/health", timeout=5)
        log("GET /api/health", r.status_code == 200, f"status={r.status_code}")
    except httpx.ConnectError:
        log("GET /api/health", False, "Connection refused — is the server running on port 8010?")
        print("\n⛔ Cannot connect to server. Aborting.")
        sys.exit(1)


def test_quick_starts():
    """GET /api/projects/quick-starts — returns pre-filled prompts."""
    section("2. Quick-Start Templates")
    r = httpx.get(f"{BASE}/api/projects/quick-starts", timeout=10)
    log("GET /quick-starts returns 200", r.status_code == 200, f"status={r.status_code}")

    if r.status_code == 200:
        data = r.json()
        log("Returns a list", isinstance(data, list), f"type={type(data).__name__}")
        log("Has 7 quick-starts", len(data) == 7, f"count={len(data)}")
        if data:
            first = data[0]
            log("First has 'name' field", "name" in first, f"keys={list(first.keys())}")
            log("First has 'prompt' field", "prompt" in first, f"name={first.get('name')}")
            print(f"    Quick-starts: {', '.join(d['name'] for d in data)}")


def test_scaffold_generation():
    """POST /api/projects/scaffold — LLM generates a kitchen remodel skeleton."""
    section("3. LLM Scaffold Generation (Kitchen Remodel)")
    payload = {
        "description": "Kitchen remodel for a 180 sq ft kitchen. Replace cabinets, new quartz countertops, tile backsplash, new appliances, paint. Budget $42K, timeline 2 months.",
        "project_type": "contract",
        "industry": "residential_construction",
        "budget": 42000,
        "timeline_months": 2,
        "num_worksites": 1,
    }

    print("    ⏳ Calling Claude API (may take 3-5 seconds)...")
    start = time.time()
    r = httpx.post(f"{BASE}/api/projects/scaffold", json=payload, timeout=30)
    elapsed = time.time() - start
    log("POST /scaffold returns 200", r.status_code == 200, f"status={r.status_code} ({elapsed:.1f}s)")

    if r.status_code == 200:
        data = r.json()
        stored["scaffold"] = data

        wgs = data.get("workgroups", [])
        jobs = data.get("jobs", [])
        ws = data.get("worksites", [])

        log("Has workgroups", len(wgs) > 0, f"count={len(wgs)}")
        log("Has jobs", len(jobs) > 0, f"count={len(jobs)}")
        log("Has worksites", len(ws) > 0, f"count={len(ws)}")
        log("Has summary", bool(data.get("summary")), f"len={len(data.get('summary', ''))}")
        log("Has estimated_duration_days", data.get("estimated_duration_days", 0) > 0, f"days={data.get('estimated_duration_days')}")

        # Validate structure
        if wgs:
            first_wg = wgs[0]
            log("WG has 'title'", "title" in first_wg, f"title={first_wg.get('title')}")
            log("WG has 'trade'", "trade" in first_wg, f"trade={first_wg.get('trade')}")
            log("WG has 'depends_on_indices'", "depends_on_indices" in first_wg)

        if jobs:
            first_job = jobs[0]
            log("Job has 'title'", "title" in first_job, f"title={first_job.get('title')}")
            log("Job has 'est_duration_days'", "est_duration_days" in first_job, f"days={first_job.get('est_duration_days')}")
            log("Job has 'workgroup_index'", "workgroup_index" in first_job)

        # Print summary
        print(f"\n    Generated scaffold:")
        print(f"    {len(wgs)} workgroups, {len(jobs)} jobs, {len(ws)} worksites")
        print(f"    Estimated duration: {data.get('estimated_duration_days')} days")
        print(f"    Trades: {', '.join(set(wg.get('trade', '?') for wg in wgs))}")
        for i, wg in enumerate(wgs):
            deps = wg.get("depends_on_indices", [])
            dep_names = [wgs[d]["title"] for d in deps if d < len(wgs)]
            job_count = sum(1 for j in jobs if j.get("workgroup_index") == i)
            print(f"      [{i}] {wg['title']} ({wg.get('trade')}) — {job_count} jobs" +
                  (f" — depends on: {', '.join(dep_names)}" if dep_names else ""))
    else:
        print(f"    Response: {r.text[:500]}")


def test_create_template():
    """POST /api/templates — save the scaffold as a template."""
    section("4. Create Template from Scaffold")

    if "scaffold" not in stored:
        log("Create template", False, "No scaffold from step 3")
        return

    payload = {
        "name": "My Kitchen Remodel Template",
        "description": "Standard kitchen remodel — cabinets, countertops, tile, paint",
        "industry": "residential_construction",
        "project_subtype": "kitchen_remodel",
        "project_type_default": "contract",
        "scaffold_data": stored["scaffold"],
        "tags": ["residential", "kitchen", "remodel"],
    }

    r = httpx.post(f"{BASE}/api/templates", json=payload, timeout=10)
    log("POST /templates returns 201", r.status_code == 201, f"status={r.status_code}")

    if r.status_code == 201:
        data = r.json()
        stored["template_id"] = data.get("id")
        log("Returns template ID", bool(data.get("id")), f"id={data.get('id')}")
        log("Name matches", data.get("name") == "My Kitchen Remodel Template")
        log("Version is 1", data.get("version") == 1, f"version={data.get('version')}")
        log("Usage count is 0", data.get("usage_count") == 0)
        log("Source is 'manual'", data.get("source") == "manual", f"source={data.get('source')}")
        log("Has scaffold_data", bool(data.get("scaffold_data")))
    else:
        print(f"    Response: {r.text[:500]}")


def test_list_templates():
    """GET /api/templates — list all templates."""
    section("5. List Templates")

    r = httpx.get(f"{BASE}/api/templates", timeout=10)
    log("GET /templates returns 200", r.status_code == 200, f"status={r.status_code}")

    if r.status_code == 200:
        data = r.json()
        log("Returns a list", isinstance(data, list), f"count={len(data)}")
        if data:
            first = data[0]
            log("Has workgroup_count", "workgroup_count" in first, f"wgs={first.get('workgroup_count')}")
            log("Has job_count", "job_count" in first, f"jobs={first.get('job_count')}")
            log("No scaffold_data in list view", "scaffold_data" not in first)
            print(f"\n    Templates found:")
            for t in data:
                print(f"      • {t['name']} ({t.get('industry', 'n/a')}) — {t.get('workgroup_count', '?')} WGs, {t.get('job_count', '?')} jobs, used {t.get('usage_count', 0)}x")

    # Test with industry filter
    r2 = httpx.get(f"{BASE}/api/templates?industry=residential_construction", timeout=10)
    log("Filter by industry returns 200", r2.status_code == 200)

    # Test with search
    r3 = httpx.get(f"{BASE}/api/templates?search=Kitchen", timeout=10)
    log("Search by name returns 200", r3.status_code == 200)
    if r3.status_code == 200:
        results_data = r3.json()
        log("Search finds our template", len(results_data) > 0, f"count={len(results_data)}")


def test_get_template():
    """GET /api/templates/{id} — get full template with scaffold_data."""
    section("6. Get Template Detail")

    if "template_id" not in stored:
        log("Get template", False, "No template ID from step 4")
        return

    r = httpx.get(f"{BASE}/api/templates/{stored['template_id']}", timeout=10)
    log("GET /templates/{id} returns 200", r.status_code == 200, f"status={r.status_code}")

    if r.status_code == 200:
        data = r.json()
        log("Has scaffold_data", bool(data.get("scaffold_data")))
        sd = data.get("scaffold_data", {})
        log("scaffold_data has workgroups", len(sd.get("workgroups", [])) > 0)
        log("scaffold_data has jobs", len(sd.get("jobs", [])) > 0)
        log("Has tags", isinstance(data.get("tags"), list))

    # Test 404 for bad ID
    r2 = httpx.get(f"{BASE}/api/templates/nonexistent-id", timeout=10)
    log("Bad ID returns 404", r2.status_code == 404)


def test_update_template():
    """PUT /api/templates/{id} — update and verify version increment."""
    section("7. Update Template")

    if "template_id" not in stored:
        log("Update template", False, "No template ID")
        return

    payload = {
        "name": "My Kitchen Remodel Template v2",
        "tags": ["residential", "kitchen", "remodel", "updated"],
    }

    r = httpx.put(f"{BASE}/api/templates/{stored['template_id']}", json=payload, timeout=10)
    log("PUT /templates/{id} returns 200", r.status_code == 200, f"status={r.status_code}")

    if r.status_code == 200:
        data = r.json()
        log("Name updated", data.get("name") == "My Kitchen Remodel Template v2")
        log("Version incremented to 2", data.get("version") == 2, f"version={data.get('version')}")
        log("Tags updated", "updated" in (data.get("tags") or []))


def test_duplicate_template():
    """POST /api/templates/{id}/duplicate — copy template."""
    section("8. Duplicate Template")

    if "template_id" not in stored:
        log("Duplicate template", False, "No template ID")
        return

    r = httpx.post(f"{BASE}/api/templates/{stored['template_id']}/duplicate", timeout=10)
    log("POST /templates/{id}/duplicate returns 201", r.status_code == 201, f"status={r.status_code}")

    if r.status_code == 201:
        data = r.json()
        stored["duplicate_id"] = data.get("id")
        log("New ID differs from original", data.get("id") != stored["template_id"])
        log("Name has '(Copy)'", "(Copy)" in data.get("name", ""))
        log("Version is 1", data.get("version") == 1)
        log("Has scaffold_data", bool(data.get("scaffold_data")))


def test_create_project_from_template():
    """POST /api/projects/create-from-template/{id} — full project creation."""
    section("9. Create Project from Template")

    if "template_id" not in stored:
        log("Create from template", False, "No template ID")
        return

    payload = {
        "project_name": "Smith Kitchen Remodel — 456 Oak Ave",
        "project_description": "Kitchen remodel for the Smith residence",
        "project_settings": {
            "project_type": "contract",
            "industry": "residential_construction",
            "project_subtype": "kitchen_remodel",
            "contractor_payment_terms": 15,
            "client_payment_terms": 30,
            "client_name": "John Smith",
            "contract_value": 52000,
            "retainage_pct": 0.10,
            "retainage_release": "substantial_completion",
            "draw_frequency": "monthly",
        },
        "total_budget": 42000,
        "start_date": "2026-04-01",
    }

    r = httpx.post(
        f"{BASE}/api/projects/create-from-template/{stored['template_id']}",
        json=payload,
        timeout=15,
    )
    log("POST /create-from-template returns 200", r.status_code == 200, f"status={r.status_code}")

    if r.status_code == 200:
        data = r.json()
        stored["project_from_template"] = data.get("project_id")
        log("Returns project_id", bool(data.get("project_id")), f"id={data.get('project_id')}")
        log("Has worksite_count", data.get("worksite_count", 0) > 0, f"count={data.get('worksite_count')}")
        log("Has workgroup_count", data.get("workgroup_count", 0) > 0, f"count={data.get('workgroup_count')}")
        log("Has job_count", data.get("job_count", 0) > 0, f"count={data.get('job_count')}")
        log("Template ID linked", data.get("template_id") == stored["template_id"])
        print(f"\n    Created project: {data.get('project_id')}")
        print(f"    {data.get('worksite_count')} worksites, {data.get('workgroup_count')} WGs, {data.get('job_count')} jobs")
    else:
        print(f"    Response: {r.text[:500]}")


def test_create_project_from_scaffold():
    """POST /api/projects/create-from-scaffold — direct scaffold to project."""
    section("10. Create Project from LLM Scaffold (Direct)")

    if "scaffold" not in stored:
        log("Create from scaffold", False, "No scaffold from step 3")
        return

    payload = {
        "scaffold": stored["scaffold"],
        "project_settings": {
            "project_type": "direct",
            "industry": "residential_construction",
            "contractor_payment_terms": 30,
        },
        "project_name": "Office Break Room Refresh",
        "project_description": "Internal CapEx project — refreshing the office break room",
        "total_budget": 15000,
        "start_date": "2026-05-01",
        "save_as_template": True,
        "template_name": "Break Room Refresh Template",
    }

    r = httpx.post(f"{BASE}/api/projects/create-from-scaffold", json=payload, timeout=15)
    log("POST /create-from-scaffold returns 200", r.status_code == 200, f"status={r.status_code}")

    if r.status_code == 200:
        data = r.json()
        stored["project_from_scaffold"] = data.get("project_id")
        log("Returns project_id", bool(data.get("project_id")))
        log("Has workgroup_count", data.get("workgroup_count", 0) > 0)
        log("Template saved", data.get("template_id") is not None, f"template_id={data.get('template_id')}")
    else:
        print(f"    Response: {r.text[:500]}")


def test_create_template_from_project():
    """POST /api/templates/from-project/{id} — extract project skeleton."""
    section("11. Create Template from Existing Project")

    # Use the seed project
    project_id = "d0000000-0000-0000-0000-000000000001"

    payload = {
        "name": "Multi-Site Renovation Template",
        "description": "Extracted from the ABC Properties seed project",
        "tags": ["residential", "multi-site", "renovation"],
    }

    r = httpx.post(f"{BASE}/api/templates/from-project/{project_id}", json=payload, timeout=15)
    log("POST /templates/from-project returns 201", r.status_code == 201, f"status={r.status_code}")

    if r.status_code == 201:
        data = r.json()
        stored["project_template_id"] = data.get("id")
        sd = data.get("scaffold_data", {})
        log("Has scaffold_data", bool(sd))
        log("scaffold_data has workgroups", len(sd.get("workgroups", [])) > 0, f"count={len(sd.get('workgroups', []))}")
        log("scaffold_data has jobs", len(sd.get("jobs", [])) > 0, f"count={len(sd.get('jobs', []))}")
        log("Source is 'from_project'", data.get("source") == "from_project")
        log("source_project_id set", data.get("source_project_id") == project_id)

        # Print extracted skeleton
        wgs = sd.get("workgroups", [])
        jobs = sd.get("jobs", [])
        print(f"\n    Extracted: {len(wgs)} workgroups, {len(jobs)} jobs")
        for wg in wgs:
            job_count = sum(1 for j in jobs if j.get("workgroup_index") == wgs.index(wg))
            print(f"      • {wg['title']} ({wg.get('trade', 'n/a')}) — {job_count} jobs, {wg.get('budget_pct', 0)*100:.1f}% budget")
    else:
        print(f"    Response: {r.text[:500]}")


def test_archive_template():
    """DELETE /api/templates/{id} — soft delete."""
    section("12. Archive Template")

    if "duplicate_id" not in stored:
        log("Archive template", False, "No duplicate from step 8")
        return

    r = httpx.delete(f"{BASE}/api/templates/{stored['duplicate_id']}", timeout=10)
    log("DELETE /templates/{id} returns 200", r.status_code == 200, f"status={r.status_code}")

    # Verify it's gone from default listing
    r2 = httpx.get(f"{BASE}/api/templates", timeout=10)
    if r2.status_code == 200:
        ids = [t["id"] for t in r2.json()]
        log("Archived template not in list", stored["duplicate_id"] not in ids)


def test_scaffold_refinement():
    """POST /api/projects/scaffold/refine — modify an existing scaffold."""
    section("13. LLM Scaffold Refinement")

    if "scaffold" not in stored:
        log("Refine scaffold", False, "No scaffold from step 3")
        return

    payload = {
        "current_scaffold": stored["scaffold"],
        "feedback": "Add a permit and inspection phase at the beginning before any demolition work starts. Also add a final cleaning workgroup at the end.",
    }

    print("    ⏳ Calling Claude API for refinement...")
    start = time.time()
    r = httpx.post(f"{BASE}/api/projects/scaffold/refine", json=payload, timeout=30)
    elapsed = time.time() - start
    log("POST /scaffold/refine returns 200", r.status_code == 200, f"status={r.status_code} ({elapsed:.1f}s)")

    if r.status_code == 200:
        data = r.json()
        wgs = data.get("workgroups", [])
        wg_names = [wg["title"].lower() for wg in wgs]

        log("Has workgroups", len(wgs) > 0, f"count={len(wgs)}")
        log("More WGs than original", len(wgs) > len(stored["scaffold"].get("workgroups", [])),
            f"new={len(wgs)} vs original={len(stored['scaffold'].get('workgroups', []))}")

        # Check if permit/inspection was added
        has_permit = any("permit" in n or "inspection" in n for n in wg_names)
        log("Permit/inspection WG added", has_permit, f"names={wg_names}")

        # Check if cleaning was added
        has_clean = any("clean" in n for n in wg_names)
        log("Cleaning WG added", has_clean)
    else:
        print(f"    Response: {r.text[:500]}")


# ═══════════════════════════════════════════════════════════
# RUNNER
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "═" * 60)
    print("  CMS BACKEND TEST — Project Settings, Templates & Scaffolding")
    print("  Server: " + BASE)
    print("═" * 60)

    test_health()
    test_quick_starts()
    test_scaffold_generation()
    test_create_template()
    test_list_templates()
    test_get_template()
    test_update_template()
    test_duplicate_template()
    test_create_project_from_template()
    test_create_project_from_scaffold()
    test_create_template_from_project()
    test_archive_template()
    test_scaffold_refinement()

    # ── Summary ───────────────────────────────────────────
    section("SUMMARY")
    passed = sum(1 for _, p in results if p)
    failed = sum(1 for _, p in results if not p)
    total = len(results)

    print(f"\n  {PASS} Passed: {passed}/{total}")
    if failed > 0:
        print(f"  {FAIL} Failed: {failed}/{total}")
        print(f"\n  Failed tests:")
        for name, p in results:
            if not p:
                print(f"    {FAIL} {name}")
    else:
        print(f"\n  🎉 All {total} tests passed!")

    print(f"\n  Stored IDs:")
    for k, v in stored.items():
        if k != "scaffold":
            print(f"    {k}: {v}")

    print()
