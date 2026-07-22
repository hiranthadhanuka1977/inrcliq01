"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";

export type SelectedPlace = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  provider: "google" | "osm";
};

type PlaceSuggestion = SelectedPlace;

type LocationSearchFieldProps = {
  label: string;
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
  invalid?: boolean;
};

function toCustomPlace(label: string): SelectedPlace {
  return {
    id: `custom:${label.toLowerCase()}`,
    label,
    lat: 0,
    lng: 0,
    provider: "osm",
  };
}

function isCustomPlace(place: SelectedPlace | null) {
  return Boolean(place?.id.startsWith("custom:"));
}

export default function LocationSearchField({
  label,
  value,
  onChange,
  inputRef,
  placeholder = "Search Google Maps",
  invalid = false,
}: LocationSearchFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.label ?? "");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<"google" | "osm" | "none">("none");

  useEffect(() => {
    if (value && !isCustomPlace(value)) {
      setQuery(value.label);
    }
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (value && !isCustomPlace(value) && trimmed === value.label) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as {
          results: PlaceSuggestion[];
          provider: "google" | "osm" | "none" | "error";
        };
        setResults(json.results ?? []);
        setProvider(json.provider === "google" || json.provider === "osm" ? json.provider : "none");
        setOpen(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectPlace(place: PlaceSuggestion) {
    onChange(place);
    setQuery(place.label);
    setResults([]);
    setOpen(false);
  }

  function clearPlace() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function syncTypedLocation(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (trimmed.length >= 2) {
      onChange(toCustomPlace(trimmed));
    } else {
      onChange(null);
    }
  }

  const mapsHref = value
    ? value.lat || value.lng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${value.lat},${value.lng}`)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.label)}`
    : null;

  const showResults =
    open && query.trim().length >= 2 && !(value && !isCustomPlace(value) && value.label === query.trim());

  return (
    <div className="requests-location" ref={rootRef}>
      <label className={`requests-pz__field${invalid ? " is-invalid" : ""}`}>
        <span className="requests-pz__label">{label}</span>
        <span className="requests-location__control">
          <span className="requests-location__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className={`requests-pz__input requests-location__input${invalid ? " is-invalid" : ""}`}
            type="text"
            role="combobox"
            aria-expanded={showResults}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={invalid || undefined}
            autoComplete="off"
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              syncTypedLocation(next);
            }}
            onFocus={() => {
              if (query.trim().length >= 2 && !(value && !isCustomPlace(value))) {
                setOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (results[0]) {
                  selectPlace(results[0]);
                } else {
                  syncTypedLocation(query);
                  setOpen(false);
                }
              }
            }}
          />
          {value || query ? (
            <button
              type="button"
              className="requests-location__clear"
              aria-label="Clear location"
              onClick={clearPlace}
            >
              ×
            </button>
          ) : null}
        </span>
      </label>

      {showResults ? (
        <ul id={listId} className="requests-location__results" role="listbox">
          {loading ? <li className="requests-location__status">Searching…</li> : null}
          {!loading
            ? results.map((place) => (
                <li key={place.id} role="option">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectPlace(place)}
                  >
                    <strong>{place.label.split(",")[0]}</strong>
                    <span>{place.label}</span>
                  </button>
                </li>
              ))
            : null}
          {!loading ? (
            <li role="option">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  syncTypedLocation(query);
                  setOpen(false);
                }}
              >
                <strong>Use “{query.trim()}”</strong>
                <span>Save this location as entered</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {value && mapsHref ? (
        <p className="requests-location__selected">
          <a href={mapsHref} target="_blank" rel="noreferrer">
            View on Google Maps
          </a>
          {provider === "osm" && (value.lat || value.lng) ? (
            <span className="requests-location__provider"> · Map search</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
