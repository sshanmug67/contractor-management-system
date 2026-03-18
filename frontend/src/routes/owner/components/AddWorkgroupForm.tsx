/**
 * AddWorkgroupForm — Create a workgroup within a project
 *
 * Opens as a slide-in panel. The key UX win: user picks a project
 * directly without having to create a worksite first.
 *
 * Fields:
 *   - Title (required)
 *   - Trade (optional dropdown)
 *   - Budget (optional)
 *   - Start/End dates (optional)
 *   - Default Location (optional, via LocationPicker)
 *   - Contractor (future: ContractorPicker)
 *
 * When a location is selected, auto-creates a worksite in the project.
 *
 * File: src/routes/owner/components/AddWorkgroupForm.tsx
 */

import { useState } from "react";
import { XI, MapPinI, HammerI, CalI, DollarI, P } from "./projectConstants";
import { LocationPicker } from "./LocationPicker";
import type { BusinessLocation } from "@/types/location";
import locationService from "@/services/locationService";
import apiClient from "@/services/api";

/* ═══════════════════ PROPS ═══════════════════ */

interface AddWorkgroupFormProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void; // called after successful creation to refresh data
}

/* ═══════════════════ TRADES ═══════════════════ */

const TRADES = [
  "Roofing", "Electrical", "Plumbing", "Painting", "HVAC", "Flooring",
  "Carpentry", "Masonry", "Landscaping", "Demolition", "Concrete",
  "Drywall", "Insulation", "Framing", "Siding", "Windows", "Other",
];

/* ═══════════════════ COMPONENT ═══════════════════ */

export function AddWorkgroupForm({ projectId, onClose, onCreated }: AddWorkgroupFormProps) {
  // Form fields
  const [title, setTitle] = useState("");
  const [trade, setTrade] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState<BusinessLocation | null>(null);

  // State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Submit handler ─────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }

    setSaving(true);
    setError(null);

    try {
      // Step 1: If location selected, auto-create worksite in project
      let worksiteId: string | undefined;
      if (location) {
        const worksite = await locationService.createWorksite(location.id, projectId);
        worksiteId = worksite.id;
      }

      // Step 2: Create the workgroup
      const payload: Record<string, unknown> = {
        project_id: projectId,
        title: title.trim(),
        status: "draft",
      };

      if (trade) payload.trade = trade;
      if (budget) payload.budget = parseFloat(budget);
      if (startDate) payload.start_date = startDate;
      if (endDate) payload.end_date = endDate;
      if (worksiteId) payload.worksite_id = worksiteId;

      await apiClient.post("/workgroups/", payload);

      // Success — close and refresh
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create workgroup";
      setError(msg);
    }
    setSaving(false);
  };

  // ═══════════════════ RENDER ═══════════════════

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)",
          zIndex: 100, animation: "fadeIn .15s ease",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 440, background: "#fff", zIndex: 101,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.1)",
        animation: "drawerIn .2s ease",
        fontFamily: "'Outfit',sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #ECEAE6",
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1A1814", margin: 0 }}>Add Workgroup</h2>
            <p style={{ fontSize: 11, color: "#9C8E7C", marginTop: 2 }}>Create a new workgroup in this project</p>
          </div>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 6, border: "1px solid #ECEAE6",
            background: "#FAFAF8", cursor: "pointer", display: "flex",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#F0EDE8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#FAFAF8"; }}>
            <XI size={14} color="#9C8E7C" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Error */}
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 6, marginBottom: 16,
              background: "#FEF0ED", border: "1px solid #F5C5BA",
              fontSize: 12, color: "#D44A2E", fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {/* Title */}
          <FormField label="Workgroup Title" required icon={<HammerI size={12} color="#8C7E6A" />}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Electrical Phase 1, Roof Replacement"
              autoFocus
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3D6B5E"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#ECEAE6"; }}
            />
          </FormField>

          {/* Trade */}
          <FormField label="Trade" icon={<HammerI size={12} color="#8C7E6A" />}>
            <select value={trade} onChange={(e) => setTrade(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Select a trade (optional)</option>
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>

          {/* Budget */}
          <FormField label="Budget" icon={<DollarI size={12} color="#8C7E6A" />}>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
              min="0"
              step="100"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3D6B5E"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#ECEAE6"; }}
            />
          </FormField>

          {/* Dates */}
          <div style={{ display: "flex", gap: 12, marginBottom: 0 }}>
            <FormField label="Start Date" icon={<CalI size={12} color="#8C7E6A" />} flex={1}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); }}
                min={new Date().toISOString().split("T")[0]}
                style={{ ...inputStyle, cursor: "pointer" }}
              />
            </FormField>
            <FormField label="End Date" icon={<CalI size={12} color="#8C7E6A" />} flex={1}>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split("T")[0]}
                style={{ ...inputStyle, cursor: "pointer" }}
              />
            </FormField>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #ECEAE6", margin: "20px 0" }} />

          {/* Location Picker */}
          <div style={{ marginBottom: 16 }}>
            <LocationPicker
              value={location}
              onChange={setLocation}
              label="Default Worksite Location"
              hint="Optional. Select a business location to auto-create a worksite for this workgroup."
              placeholder="Search locations or enter address..."
            />
          </div>

          {/* Location selected confirmation */}
          {location && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 6,
              background: "#EDFAF4", border: "1px solid #B5E2CC",
              marginBottom: 16,
            }}>
              <MapPinI size={12} color="#2E7D5F" />
              <span style={{ fontSize: 11, color: "#2E7D5F", fontWeight: 600 }}>
              This workgroup will be assigned to the worksite at this location.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 20px", borderTop: "1px solid #ECEAE6",
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            border: "1.5px solid #ECEAE6", background: "#fff", color: "#5C5043",
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !title.trim()} style={{
            padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            border: "none", background: saving || !title.trim() ? "#B5A99A" : P.done.grad,
            color: "#fff", cursor: saving || !title.trim() ? "not-allowed" : "pointer",
            fontFamily: "'Outfit',sans-serif", transition: "all .15s",
          }}>
            {saving ? "Creating..." : "Create Workgroup"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Form field wrapper ── */
function FormField({ label, required, icon, children, flex }: {
  label: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode; flex?: number;
}) {
  return (
    <div style={{ marginBottom: 16, flex }}>
      <label style={{
        display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, fontWeight: 700, color: "#5C5043", marginBottom: 5,
      }}>
        {icon}
        {label}
        {required && <span style={{ color: "#D44A2E" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Shared input style ── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 6,
  border: "1.5px solid #ECEAE6", fontSize: 13, fontFamily: "'Outfit',sans-serif",
  color: "#1A1814", background: "#fff", outline: "none",
  transition: "border-color .15s",
};

export default AddWorkgroupForm;
