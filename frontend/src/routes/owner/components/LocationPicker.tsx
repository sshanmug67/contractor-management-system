/**
 * LocationPicker — Search, select, or create a business location
 *
 * Three modes:
 *   1. Search existing org locations (type-ahead dropdown)
 *   2. Enter a new address with Google Places autocomplete suggestions
 *   3. Free-text fallback with backend verify if Places SDK unavailable
 *
 * File: src/routes/owner/components/LocationPicker.tsx
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPinI, CheckI, XI, AlertCI } from "./projectConstants";
import type { BusinessLocation, AddressVerification, CreateLocationRequest, LocationType } from "@/types/location";
import { LOCATION_TYPE_LABELS, formatLocationAddress } from "@/types/location";
import locationService from "@/services/locationService";
import { useGooglePlaces, type PlaceSuggestion} from "@/hooks/useGooglePlaces";

/* ═══════════════════ PROPS ═══════════════════ */

interface LocationPickerProps {
  value: BusinessLocation | null;
  onChange: (location: BusinessLocation | null) => void;
  placeholder?: string;
  allowCreate?: boolean;
  filterType?: LocationType;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

/* ═══════════════════ COMPONENT ═══════════════════ */

export function LocationPicker({
  value,
  onChange,
  placeholder = "Search locations or enter an address...",
  allowCreate = true,
  filterType,
  label,
  hint,
  disabled = false,
}: LocationPickerProps) {
  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // New address form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLine1, setNewLine1] = useState("");
  const [newLine2, setNewLine2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");
  const [newType, setNewType] = useState<LocationType>("other");
  const [newPlaceId, setNewPlaceId] = useState<string | null>(null);
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [verification, setVerification] = useState<AddressVerification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Google Places autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const places = useGooglePlaces();
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── DEBUG: Log Places SDK state on every render ──
  // console.log("[LocationPicker] places.loaded:", places.loaded, "| places.hasKey:", places.hasKey, "| suggestions:", places.suggestions.length, "| addressSuggestions:", addressSuggestions.length);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Search existing locations ──────────────────────
  const searchLocations = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await locationService.list({
        search: q,
        is_active: true,
        location_type: filterType,
        limit: 8,
      });
      setResults(data);
    } catch { setResults([]); }
    setLoading(false);
  }, [filterType]);

  // Debounced search — existing locations + Google Places
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 2 && !value) {
      debounceRef.current = setTimeout(() => {
        // console.log("[LocationPicker] Debounced search firing — query:", query, "| places.loaded:", places.loaded);
        searchLocations(query);
        // Also trigger Google Places autocomplete from the main input
        if (places.loaded && query.length >= 3) {
          // console.log("[LocationPicker] ✅ Calling places.search() with:", query);
          places.search(query);
        } 
      }, 250);
    } else {
      setResults([]);
      if (places.loaded) places.clear();
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchLocations, value, places.loaded]);

  // ── Click outside to close ─────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSuggestions(false);
        setAddressSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Select a Google Places suggestion from MAIN dropdown ──
  const handleMainPlaceSelect = async (suggestion: PlaceSuggestion) => {
    setOpen(false);
    places.clear();

    const details = await places.selectPlace(suggestion.place_id);
    if (!details) return;

    // Open the new location form pre-filled with all details
    setShowNewForm(true);
    setNewLine1(details.address_line1);
    if (details.address_line2) setNewLine2(details.address_line2);
    setNewCity(details.city);
    setNewState(details.state);
    setNewZip(details.zip_code);
    setNewPlaceId(details.place_id);
    setNewLat(details.lat);
    setNewLng(details.lng);
    setNewName(details.address_line1 || suggestion.main_text);
    setQuery("");

    // Mark as verified (Google Places data is rooftop-accurate)
    setVerification({
      is_valid: true,
      status: "verified",
      confidence: "high",
      issues: [],
      geocode: {
        lat: details.lat,
        lng: details.lng,
        formatted_address: details.formatted_address,
        place_id: details.place_id,
        address_line1: details.address_line1,
        city: details.city,
        state: details.state,
        zip_code: details.zip_code,
      },
    });
  };

  // ── Select an existing location ────────────────────
  const handleSelect = (loc: BusinessLocation) => {
    onChange(loc);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  // ── Clear selection ────────────────────────────────
  const handleClear = () => {
    onChange(null);
    setQuery("");
    setVerification(null);
    setShowNewForm(false);
    setNewPlaceId(null);
    setNewLat(null);
    setNewLng(null);
    setAddressSuggestions([]);
    places.clear();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Address field change → trigger Places autocomplete ──
  const handleAddressChange = (val: string) => {
    setNewLine1(val);
    setVerification(null);
    setNewPlaceId(null);
    setNewLat(null);
    setNewLng(null);

    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);

    if (places.loaded && val.length >= 3) {
      addressDebounceRef.current = setTimeout(() => {
        places.search(val);
        setShowSuggestions(true);
      }, 200);
    } else {
      setShowSuggestions(false);
      places.clear();
    }
  };

  // Update suggestions when places results change
  useEffect(() => {
    // console.log("[LocationPicker] places.suggestions changed — count:", places.suggestions.length, "| data:", places.suggestions.map(s => s.description));
    setAddressSuggestions(places.suggestions);
  }, [places.suggestions]);

  // ── Select a Google Places suggestion ──────────────
  const handlePlaceSelect = async (suggestion: PlaceSuggestion) => {
    setShowSuggestions(false);
    places.clear();

    const details = await places.selectPlace(suggestion.place_id);
    if (!details) return;

    // Auto-fill all fields from the place details
    setNewLine1(details.address_line1);
    if (details.address_line2) setNewLine2(details.address_line2);
    setNewCity(details.city);
    setNewState(details.state);
    setNewZip(details.zip_code);
    setNewPlaceId(details.place_id);
    setNewLat(details.lat);
    setNewLng(details.lng);

    // Auto-set name if empty
    if (!newName) {
      setNewName(details.address_line1 || suggestion.main_text);
    }

    // Mark as verified (Google Places data is rooftop-accurate)
    setVerification({
      is_valid: true,
      status: "verified",
      confidence: "high",
      issues: [],
      geocode: {
        lat: details.lat,
        lng: details.lng,
        formatted_address: details.formatted_address,
        place_id: details.place_id,
        address_line1: details.address_line1,
        city: details.city,
        state: details.state,
        zip_code: details.zip_code,
      },
    });
  };

  // ── Verify free-text address (fallback) ────────────
  const handleVerify = async () => {
    const fullAddress = [newLine1, newLine2, newCity, newState, newZip].filter(Boolean).join(", ");
    if (!fullAddress || fullAddress.length < 5) return;

    setVerifying(true);
    try {
      const result = await locationService.verify(fullAddress);
      setVerification(result);

      // Auto-fill/correct fields from geocode
      if (result.geocode) {
        if (result.geocode.city) setNewCity(result.geocode.city);
        if (result.geocode.state) setNewState(result.geocode.state);
        if (result.geocode.zip_code) setNewZip(result.geocode.zip_code);
        if (result.geocode.address_line1) setNewLine1(result.geocode.address_line1);
        if (result.geocode.place_id) setNewPlaceId(result.geocode.place_id);
        setNewLat(result.geocode.lat);
        setNewLng(result.geocode.lng);
      }
    } catch {
      setVerification(null);
    }
    setVerifying(false);
  };

  // ── Save new location ──────────────────────────────
  const handleSaveNew = async () => {
    if (!newName.trim() || !newLine1.trim()) return;

    setSaving(true);
    try {
      const req: CreateLocationRequest = {
        name: newName.trim(),
        location_type: newType,
        address_line1: newLine1.trim(),
        address_line2: newLine2.trim() || undefined,
        city: newCity.trim() || undefined,
        state: newState.trim() || undefined,
        zip_code: newZip.trim() || undefined,
        google_place_id: newPlaceId || undefined,
        geo_latitude: newLat || undefined,
        geo_longitude: newLng || undefined,
        auto_verify: !newPlaceId, // skip backend verify if we already have Places data
      };

      const loc = await locationService.create(req);
      onChange(loc);
      setShowNewForm(false);
      setQuery("");
      setVerification(null);
      setAddressSuggestions([]);
    } catch (err) {
      console.error("Failed to save location:", err);
    }
    setSaving(false);
  };

  // ── Verification badge ─────────────────────────────
  const VBadge = ({ status }: { status: string }) => {
    const isVerified = status === "verified";
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700,
        background: isVerified ? "#EDFAF4" : status === "failed" ? "#FEF0ED" : "#FFF8EE",
        color: isVerified ? "#2E7D5F" : status === "failed" ? "#D44A2E" : "#C07B1A",
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>
        {isVerified ? <CheckI size={9} color="#2E7D5F" /> : <AlertCI size={9} color={status === "failed" ? "#D44A2E" : "#C07B1A"} />}
        {isVerified ? "Verified" : status === "failed" ? "Not found" : "Unverified"}
      </span>
    );
  };

  // ═══════════════════ RENDER ═══════════════════

  return (
    <div ref={containerRef} style={{ position: "relative", fontFamily: "'Outfit',sans-serif" }}>
      {/* Label */}
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5C5043", marginBottom: 4 }}>
          {label}
        </label>
      )}

      {/* ── Selected state ── */}
      {value ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: "#FAFAF8", border: "1.5px solid #3D6B5E", borderRadius: 8,
          opacity: disabled ? 0.6 : 1,
        }}>
          <MapPinI size={14} color="#3D6B5E" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1814", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value.name}
            </div>
            <div style={{ fontSize: 11, color: "#8C7E6A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {formatLocationAddress(value)}
            </div>
          </div>
          <VBadge status={value.verification_status || "unverified"} />
          {!disabled && (
            <button onClick={handleClear} style={{
              padding: 4, borderRadius: 4, border: "none", background: "transparent",
              cursor: "pointer", display: "flex", alignItems: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ECEAE6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <XI size={12} color="#9C8E7C" />
            </button>
          )}
        </div>
      ) : (
        /* ── Search input ── */
        <div style={{ position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
            background: "#fff", border: `1.5px solid ${open ? "#3D6B5E" : "#ECEAE6"}`,
            borderRadius: 8, transition: "border-color .15s",
          }}>
            <MapPinI size={14} color={open ? "#3D6B5E" : "#B5A99A"} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => { if (query.length >= 2) setOpen(true); }}
              placeholder={placeholder}
              disabled={disabled}
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 13,
                fontFamily: "'Outfit',sans-serif", color: "#1A1814",
                background: "transparent",
              }}
            />
            {loading && (
              <div style={{
                width: 14, height: 14, border: "2px solid #ECEAE6",
                borderTopColor: "#3D6B5E", borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
            )}
          </div>

          {/* ── Dropdown ── */}
          {(() => { console.log("[LocationPicker] Dropdown check — open:", open, "query.length:", query.length, "results:", results.length, "addressSuggestions:", addressSuggestions.length); return null; })()}
          {open && (query.length >= 2 || results.length > 0 || addressSuggestions.length > 0) && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "#fff", borderRadius: 8, border: "1px solid #ECEAE6",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 50,
              maxHeight: 280, overflowY: "auto",
              animation: "fu .15s ease",
            }}>
              {results.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelect(loc)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 12px", border: "none",
                    background: "transparent", cursor: "pointer", textAlign: "left",
                    borderBottom: "1px solid #F5F3EF", transition: "background .1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAF8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <MapPinI size={13} color="#3D6B5E" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1814" }}>{loc.name}</div>
                    <div style={{ fontSize: 11, color: "#9C8E7C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {formatLocationAddress(loc)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: "#F5F3EF", color: "#8C7E6A", textTransform: "uppercase",
                  }}>
                    {LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type}
                  </span>
                </button>
              ))}

              {results.length === 0 && !loading && query.length >= 2 && addressSuggestions.length === 0 && (
                <div style={{ padding: "12px", textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "#9C8E7C", marginBottom: 8 }}>No matching locations found</p>
                  {allowCreate && (
                    <button
                      onClick={() => { setShowNewForm(true); setOpen(false); setNewLine1(query); }}
                      style={{
                        padding: "6px 14px", borderRadius: 6, border: "1.5px solid #3D6B5E",
                        background: "rgba(61,107,94,0.06)", color: "#3D6B5E",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                        fontFamily: "'Outfit',sans-serif",
                      }}
                    >
                      + Add new location
                    </button>
                  )}
                </div>
              )}

              {/* Google Places suggestions in main dropdown */}
              {addressSuggestions.length > 0 && (
                <>
                  {results.length > 0 && (
                    <div style={{
                      padding: "6px 12px", borderBottom: "1px solid #F5F3EF",
                      background: "#FAFAF8",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#8C7E6A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Google Suggestions
                      </span>
                    </div>
                  )}
                  {results.length === 0 && (
                    <div style={{
                      padding: "6px 12px", borderBottom: "1px solid #F5F3EF",
                      background: "#FAFAF8",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#8C7E6A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Address Suggestions
                      </span>
                    </div>
                  )}
                  {addressSuggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => handleMainPlaceSelect(s)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", padding: "10px 12px", border: "none",
                        background: "transparent", cursor: "pointer", textAlign: "left",
                        borderBottom: "1px solid #F5F3EF", transition: "background .1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAF8"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <MapPinI size={13} color="#2E7D5F" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1814" }}>{s.main_text}</div>
                        <div style={{ fontSize: 11, color: "#9C8E7C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.secondary_text}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                        background: "#EDFAF4", color: "#2E7D5F", textTransform: "uppercase",
                      }}>
                        New
                      </span>
                    </button>
                  ))}
                  <div style={{ padding: "4px 12px 6px", textAlign: "right" }}>
                    <span style={{ fontSize: 9, color: "#B5A99A" }}>Powered by Google</span>
                  </div>
                </>
              )}

              {/* Fallback: no results from either source */}
              {results.length === 0 && addressSuggestions.length > 0 && allowCreate && (
                <div style={{ padding: "8px 12px", textAlign: "center", borderTop: "1px solid #F5F3EF" }}>
                  <button
                    onClick={() => { setShowNewForm(true); setOpen(false); setNewLine1(query); }}
                    style={{
                      padding: "5px 12px", borderRadius: 6, border: "1.5px solid #ECEAE6",
                      background: "#fff", color: "#5C5043",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  >
                    + Enter address manually
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      {hint && !showNewForm && (
        <p style={{ fontSize: 11, color: "#9C8E7C", marginTop: 4 }}>{hint}</p>
      )}

      {/* ── New Location Form ── */}
      {showNewForm && !value && (
        <div style={{
          marginTop: 8, padding: 16, background: "#FAFAF8",
          border: "1.5px solid #ECEAE6", borderRadius: 10,
          animation: "fu .2s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#1A1814" }}>New Location</span>
            <button onClick={() => { setShowNewForm(false); setVerification(null); setAddressSuggestions([]); }}
              style={{ padding: 2, border: "none", background: "transparent", cursor: "pointer" }}>
              <XI size={14} color="#9C8E7C" />
            </button>
          </div>

          {/* Name + Type row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <InputField label="Name *" value={newName} onChange={setNewName} placeholder="e.g. Johnson Residence" flex={2} />
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#8C7E6A", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as LocationType)}
                style={{
                  width: "100%", padding: "7px 8px", borderRadius: 6,
                  border: "1.5px solid #ECEAE6", fontSize: 12, fontFamily: "'Outfit',sans-serif",
                  color: "#1A1814", background: "#fff", outline: "none",
                }}>
                {Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address field with Google Places suggestions */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#8C7E6A", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Address Line 1 *
              {places.loaded && (
                <span style={{ marginLeft: 6, fontSize: 9, color: "#3D6B5E", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
                  Powered by Google
                </span>
              )}
            </label>
            <input
              type="text"
              value={newLine1}
              onChange={(e) => handleAddressChange(e.target.value)}
              onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
              placeholder="Start typing an address..."
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 6,
                border: `1.5px solid ${showSuggestions && addressSuggestions.length > 0 ? "#3D6B5E" : "#ECEAE6"}`,
                fontSize: 12, fontFamily: "'Outfit',sans-serif",
                color: "#1A1814", background: "#fff", outline: "none",
                transition: "border-color .15s",
              }}
            />

            {/* Google Places suggestions dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0,
                background: "#fff", borderRadius: 8, border: "1px solid #ECEAE6",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 60,
                maxHeight: 220, overflowY: "auto",
                animation: "fu .12s ease",
              }}>
                {addressSuggestions.map((s) => (
                  <button
                    key={s.place_id}
                    onClick={() => handlePlaceSelect(s)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", padding: "9px 12px", border: "none",
                      background: "transparent", cursor: "pointer", textAlign: "left",
                      borderBottom: "1px solid #F5F3EF", transition: "background .1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAF8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <MapPinI size={12} color="#2E7D5F" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1814" }}>{s.main_text}</div>
                      <div style={{ fontSize: 10, color: "#9C8E7C" }}>{s.secondary_text}</div>
                    </div>
                  </button>
                ))}
                <div style={{ padding: "4px 12px 6px", textAlign: "right" }}>
                  <span style={{ fontSize: 9, color: "#B5A99A" }}>Powered by Google</span>
                </div>
              </div>
            )}

            {places.loading && (
              <div style={{
                position: "absolute", right: 10, top: 28,
                width: 12, height: 12, border: "2px solid #ECEAE6",
                borderTopColor: "#3D6B5E", borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
            )}
          </div>

          <InputField label="Address Line 2" value={newLine2} onChange={setNewLine2} placeholder="Suite, unit, floor (optional)" />

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <InputField label="City" value={newCity} onChange={setNewCity} placeholder="City" flex={2} />
            <InputField label="State" value={newState} onChange={setNewState} placeholder="ST" flex={0.7} />
            <InputField label="Zip" value={newZip} onChange={setNewZip} placeholder="00000" flex={1} />
          </div>

          {/* Verification result */}
          {verification && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              borderRadius: 6, marginBottom: 10,
              background: verification.is_valid ? "#EDFAF4" : verification.status === "failed" ? "#FEF0ED" : "#FFF8EE",
              border: `1px solid ${verification.is_valid ? "#B5E2CC" : verification.status === "failed" ? "#F5C5BA" : "#F0D9A8"}`,
            }}>
              {verification.is_valid
                ? <CheckI size={13} color="#2E7D5F" />
                : <AlertCI size={13} color={verification.status === "failed" ? "#D44A2E" : "#C07B1A"} />
              }
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: verification.is_valid ? "#2E7D5F" : verification.status === "failed" ? "#D44A2E" : "#C07B1A" }}>
                  {verification.is_valid ? "Address verified" : verification.status === "failed" ? "Address not found" : "Partially verified"}
                </span>
                {verification.geocode && (
                  <span style={{ fontSize: 11, color: "#8C7E6A", marginLeft: 6 }}>
                    {verification.geocode.formatted_address}
                  </span>
                )}
                {verification.issues.length > 0 && (
                  <p style={{ fontSize: 10, color: "#9C8E7C", marginTop: 2 }}>{verification.issues[0]}</p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {/* Only show Verify button if Places didn't already verify */}
            {!verification?.is_valid && (
              <button onClick={handleVerify} disabled={verifying || !newLine1.trim()}
                style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                  border: "1.5px solid #ECEAE6", background: "#fff", color: "#5C5043",
                  cursor: verifying || !newLine1.trim() ? "not-allowed" : "pointer",
                  opacity: verifying || !newLine1.trim() ? 0.5 : 1,
                  fontFamily: "'Outfit',sans-serif",
                }}>
                {verifying ? "Verifying..." : "Verify Address"}
              </button>
            )}
            <button onClick={handleSaveNew} disabled={saving || !newName.trim() || !newLine1.trim()}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                border: "none", background: "linear-gradient(135deg,#3D6B5E,#5AAE8F)",
                color: "#fff", cursor: saving || !newName.trim() || !newLine1.trim() ? "not-allowed" : "pointer",
                opacity: saving || !newName.trim() || !newLine1.trim() ? 0.5 : 1,
                fontFamily: "'Outfit',sans-serif",
              }}>
              {saving ? "Saving..." : "Save & Select"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tiny input component ── */
function InputField({ label, value, onChange, placeholder, flex }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; flex?: number;
}) {
  return (
    <div style={{ flex: flex ?? 1, marginBottom: 8 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#8C7E6A", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "7px 10px", borderRadius: 6,
          border: "1.5px solid #ECEAE6", fontSize: 12, fontFamily: "'Outfit',sans-serif",
          color: "#1A1814", background: "#fff", outline: "none",
          transition: "border-color .15s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#3D6B5E"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#ECEAE6"; }}
      />
    </div>
  );
}

export default LocationPicker;
