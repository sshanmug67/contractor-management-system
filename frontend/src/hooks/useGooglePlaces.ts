/**
 * useGooglePlaces — Hook for Google Places Autocomplete
 *
 * Uses the NEW Places API (google.maps.places.Place &
 * AutocompleteSuggestion) instead of the legacy AutocompleteService.
 *
 * Requires:
 *   - "Places API (New)" enabled in Google Cloud Console
 *   - VITE_GOOGLE_MAPS_KEY in root .env
 *
 * Usage:
 *   const { suggestions, search, selectPlace, loaded } = useGooglePlaces();
 *   search("4711 E Riverside");  // triggers autocomplete
 *   selectPlace(suggestions[0].place_id);  // gets full details
 *
 * File: src/hooks/useGooglePlaces.ts
 */

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════ TYPES ═══════════════════ */

export interface PlaceSuggestion {
  place_id: string;
  description: string;           // Full formatted address
  main_text: string;             // Bold part (e.g. "4711 E Riverside Dr")
  secondary_text: string;        // Gray part (e.g. "Austin, TX, USA")
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  lat: number;
  lng: number;
}

/* ═══════════════════ SDK LOADER ═══════════════════ */

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";
let loadPromise: Promise<void> | null = null;

function loadGoogleMapsSDK(): Promise<void> {
  if ((window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_KEY) {
      reject(new Error("VITE_GOOGLE_MAPS_KEY not set"));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps SDK"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/* ═══════════════════ HOOK ═══════════════════ */

export function useGooglePlaces() {
  const [loaded, setLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Load SDK on mount
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) {
      console.warn("[useGooglePlaces] VITE_GOOGLE_MAPS_KEY not set — autocomplete disabled");
      return;
    }

    loadGoogleMapsSDK()
      .then(() => {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setLoaded(true);
      })
      .catch((err) => {
        console.error("[useGooglePlaces] ❌ Failed to load:", err);
      });
  }, []);

  // Search for address suggestions (New API — promise-based)
  const search = useCallback(async (input: string) => {
    if (!loaded || input.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const request = {
        input,
        includedPrimaryTypes: ["street_address", "subpremise", "premise"],
        includedRegionCodes: ["us"],
        sessionToken: sessionTokenRef.current!,
      };

      const { suggestions: results } = await (
        google.maps.places as any
      ).AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      const mapped: PlaceSuggestion[] = (results || [])
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({
          place_id: s.placePrediction.placeId,
          description: s.placePrediction.text?.text || "",
          main_text: s.placePrediction.mainText?.text || s.placePrediction.text?.text || "",
          secondary_text: s.placePrediction.secondaryText?.text || "",
        }));

      setSuggestions(mapped);
    } catch (err) {
      console.error("[useGooglePlaces] Autocomplete error:", err);
      setSuggestions([]);
    }
    setLoading(false);
  }, [loaded]);

  // Get full details for a selected place (New API — Place class)
  const selectPlace = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const place = new Place({ id: placeId });

      await place.fetchFields({
        fields: [
          "formattedAddress",
          "addressComponents",
          "location",
          "id",
        ],
      });

      // Reset session token after details fetch (billing optimization)
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

      // New API uses longText/shortText instead of long_name/short_name
      const components = place.addressComponents || [];
      const get = (type: string, short = false): string => {
        const comp = components.find((c: any) => c.types?.includes(type));
        if (!comp) return "";
        return short ? (comp as any).shortText || "" : (comp as any).longText || "";
      };

      const streetNumber = get("street_number");
      const route = get("route");

      const details: PlaceDetails = {
        place_id: place.id || placeId,
        formatted_address: place.formattedAddress || "",
        address_line1: streetNumber ? `${streetNumber} ${route}` : route,
        address_line2: get("subpremise"),
        city: get("locality") || get("sublocality_level_1"),
        state: get("administrative_area_level_1", true),
        zip_code: get("postal_code"),
        country: get("country", true),
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
      };

      return details;
    } catch (err) {
      console.error("[useGooglePlaces] ❌ Place details error:", err);
      return null;
    }
  }, []);

  // Clear suggestions
  const clear = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    loaded,
    loading,
    suggestions,
    search,
    selectPlace,
    clear,
    hasKey: !!GOOGLE_MAPS_KEY,
  };
}

export default useGooglePlaces;
