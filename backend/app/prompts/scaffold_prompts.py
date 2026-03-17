"""
Scaffold Prompts — System Prompt + Quick-Start Definitions

Contains the system prompt template for Claude API scaffold generation
and the pre-filled quick-start prompt definitions.

Separated from scaffold_service.py for easy tuning without touching
the generation logic.

File: app/services/scaffold_prompts.py
"""

SCAFFOLD_SYSTEM_PROMPT = """You are a project planning expert for a contractor management system. Given a project description, generate a complete project skeleton as JSON.

RULES:
- Each workgroup must have at least 1 job
- Dependencies must not create circular references
- All est_duration_days must be positive integers
- budget_pct values across all jobs should sum to approximately 1.0 (±0.15)
- Use standard trade names: Demolition, Framing, Roofing, Electrical, Plumbing, HVAC, Drywall, Insulation, Flooring, Tile, Painting, Cabinets, Countertops, Landscaping, Concrete, Waterproofing, Fire Protection, Low Voltage, Millwork, Glazing, or other specific trades as needed
- Be specific with job titles (not generic). Example: "Install LVP flooring in master bedroom" not "Do flooring"
- Durations should be realistic for the scope described
- Include all required rough-in work before finish work
- Dependencies should encode the critical path correctly (e.g., drywall depends on all rough-in trades)
- depends_on_indices reference other workgroups by their array position (0-based)

CONTEXT:
- Project type: {project_type}
- Industry: {industry}
{budget_context}
{timeline_context}
- Number of worksites: {num_worksites}

RESPOND WITH ONLY VALID JSON (no markdown, no backticks, no preamble):
{{
  "worksites": [
    {{ "name": "Site Name", "address": "" }}
  ],
  "workgroups": [
    {{
      "title": "Workgroup Name",
      "trade": "Trade Label",
      "contractor_type": "Type of contractor needed",
      "worksite_index": 0,
      "depends_on_indices": [],
      "notes": "Important notes for this scope",
      "budget_pct": 0.15
    }}
  ],
  "jobs": [
    {{
      "title": "Specific job task",
      "workgroup_index": 0,
      "sequence": 1,
      "est_duration_days": 3,
      "budget_pct": 0.05,
      "notes": ""
    }}
  ],
  "summary": "Brief description of the generated plan",
  "estimated_duration_days": 60,
  "trade_count": 5
}}"""


REFINE_SYSTEM_PROMPT = """You are a project planning expert. The user has an existing project scaffold and wants to modify it based on their feedback. Apply their changes and return the complete updated scaffold.

RULES:
- Return the FULL updated scaffold, not a diff
- Maintain valid dependency indices after any additions/removals
- If adding workgroups, assign appropriate budget_pct and update others to still sum to ~1.0
- Keep the same JSON shape as the original
- All the same rules apply: no circular deps, positive durations, realistic estimates

CURRENT SCAFFOLD:
{current_scaffold}

RESPOND WITH ONLY VALID JSON (no markdown, no backticks, no preamble). Same shape as above."""


def build_scaffold_prompt(
    description: str,
    project_type: str = "direct",
    industry: str | None = None,
    budget: float | None = None,
    timeline_months: int | None = None,
    num_worksites: int = 1,
) -> tuple[str, str]:
    """
    Build the system prompt and user message for scaffold generation.

    Returns:
        (system_prompt, user_message)
    """
    budget_context = f"- Budget: ${budget:,.0f}" if budget else "- Budget: Not specified"
    timeline_context = f"- Timeline: {timeline_months} months" if timeline_months else "- Timeline: Not specified"

    system = SCAFFOLD_SYSTEM_PROMPT.format(
        project_type=project_type,
        industry=industry or "general",
        budget_context=budget_context,
        timeline_context=timeline_context,
        num_worksites=num_worksites,
    )

    user_message = f"Generate a project plan for:\n\n{description}"

    return system, user_message


def build_refine_prompt(current_scaffold_json: str, feedback: str) -> tuple[str, str]:
    """
    Build the system prompt and user message for scaffold refinement.

    Returns:
        (system_prompt, user_message)
    """
    system = REFINE_SYSTEM_PROMPT.format(current_scaffold=current_scaffold_json)
    user_message = f"Please modify the scaffold based on this feedback:\n\n{feedback}"

    return system, user_message


# ═══════════════════════════════════════════════════════════
# QUICK-START TEMPLATES (pre-filled prompts)
# ═══════════════════════════════════════════════════════════

QUICK_STARTS = [
    {
        "id": "kitchen_remodel",
        "name": "Kitchen Remodel",
        "industry": "residential_construction",
        "project_type_default": "contract",
        "description": "Complete kitchen renovation with all trades",
        "prompt": (
            "Complete kitchen remodel including demolition of existing cabinets and countertops, "
            "plumbing rough-in for new sink and dishwasher location, electrical rough-in for new "
            "outlet layout and under-cabinet lighting, drywall repair, cabinet installation, "
            "countertop fabrication and install, tile backsplash, painting, appliance installation, "
            "and final plumbing and electrical fixtures."
        ),
    },
    {
        "id": "bathroom_renovation",
        "name": "Bathroom Renovation",
        "industry": "residential_construction",
        "project_type_default": "contract",
        "description": "Full bathroom renovation with wet area work",
        "prompt": (
            "Full bathroom renovation including demolition of existing tile, fixtures, and vanity. "
            "Plumbing relocation for new layout, electrical update for GFCI outlets and exhaust fan, "
            "waterproofing and moisture barrier, floor and wall tile installation, new vanity and "
            "plumbing fixtures, glass shower enclosure, painting, and final accessories (mirrors, "
            "towel bars, lighting)."
        ),
    },
    {
        "id": "office_buildout",
        "name": "Office Buildout",
        "industry": "commercial_construction",
        "project_type_default": "contract",
        "description": "Commercial office space buildout from shell",
        "prompt": (
            "Commercial office buildout including demolition of existing layout, framing new "
            "offices and conference rooms, MEP rough-in (mechanical, electrical, plumbing), "
            "data and low voltage cabling, drywall and ceiling grid installation, commercial "
            "flooring (carpet tile and LVT), painting, millwork and built-ins, furniture "
            "installation, and IT infrastructure setup."
        ),
    },
    {
        "id": "restaurant_buildout",
        "name": "Restaurant Buildout",
        "industry": "commercial_construction",
        "project_type_default": "contract",
        "description": "Restaurant/food service space buildout",
        "prompt": (
            "Restaurant buildout including demolition, plumbing for kitchen stations and bar, "
            "grease trap installation, commercial hood and exhaust system, walk-in cooler "
            "installation, electrical and gas lines, finishing work (flooring, paint, wall "
            "treatment), bar construction, seating and furniture, signage and branding, and "
            "final health department inspection prep."
        ),
    },
    {
        "id": "landscape_install",
        "name": "Landscape Installation",
        "industry": "landscaping",
        "project_type_default": "contract",
        "description": "Complete landscape installation from bare lot",
        "prompt": (
            "Complete landscape installation including site survey and grading, drainage system "
            "installation, hardscape work (paver patio, retaining wall, walkways), irrigation "
            "system, planting (trees, shrubs, perennials, ground cover), mulch and decorative "
            "rock, and landscape lighting installation."
        ),
    },
    {
        "id": "fleet_maintenance",
        "name": "Fleet Maintenance Program",
        "industry": "equipment_maintenance",
        "project_type_default": "direct",
        "description": "Heavy equipment fleet overhaul and certification",
        "prompt": (
            "Heavy equipment fleet maintenance overhaul program including multi-point inspection "
            "and diagnostic assessment, engine and drivetrain service, hydraulic system rebuild "
            "and testing, electrical systems and controls update, body work and paint restoration, "
            "safety systems certification, and return-to-fleet commissioning and documentation."
        ),
    },
    {
        "id": "whole_home_reno",
        "name": "Whole-Home Renovation",
        "industry": "residential_construction",
        "project_type_default": "contract",
        "description": "Comprehensive whole-home renovation",
        "prompt": (
            "Whole-home renovation including structural assessment, foundation repair if needed, "
            "framing modifications for open floor plan, complete MEP (mechanical, electrical, "
            "plumbing) update, insulation upgrade, drywall throughout, flooring (hardwood main "
            "areas, tile in wet rooms), full kitchen remodel, two bathroom renovations, interior "
            "and exterior painting, exterior siding/trim repair, and front/back landscaping."
        ),
    },
]
