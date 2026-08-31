export const COUNTRIES = [
  { code: "LK", label: "Sri Lanka", flag: "🇱🇰" },
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "IN", label: "India", flag: "🇮🇳" },
] as const;

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
] as const;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function getCountryLabel(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

/**
 * Shape of `/api/locations`, which mirrors Decca's `/v1/reference/locations`.
 *
 * `states` is empty for countries with no subdivisions — that, not a hardcoded
 * country check, is the signal to hide the second dropdown. `state_label` carries
 * the country's own word for them ("State", "Province", "Emirate") so the label
 * comes from the data.
 */
export type LocationState = { code: string; name: string };

export type LocationCountry = {
  code: string;
  name: string;
  flag_emoji?: string | null;
  state_label?: string | null;
  has_policy: boolean;
  states: LocationState[];
};

/**
 * Offline fallback, used in mock mode and whenever the live lookup fails, so the
 * signup form always has something to render. Mirrors the five countries the
 * prototype shipped with, but with ISO 3166-2 subdivision codes rather than bare
 * names — Decca keys its age and tax rules on the codes.
 */
export const FALLBACK_LOCATIONS: LocationCountry[] = [
  {
    code: "LK",
    name: "Sri Lanka",
    flag_emoji: "🇱🇰",
    state_label: "Province",
    has_policy: false,
    states: [
      { code: "2", name: "Central Province" },
      { code: "5", name: "Eastern Province" },
      { code: "7", name: "North Central Province" },
      { code: "6", name: "North Western Province" },
      { code: "4", name: "Northern Province" },
      { code: "9", name: "Sabaragamuwa Province" },
      { code: "3", name: "Southern Province" },
      { code: "8", name: "Uva Province" },
      { code: "1", name: "Western Province" },
    ],
  },
  {
    code: "US",
    name: "United States",
    flag_emoji: "🇺🇸",
    state_label: "State",
    has_policy: true,
    states: [
      { code: "AL", name: "Alabama" },
      { code: "AK", name: "Alaska" },
      { code: "AS", name: "American Samoa" },
      { code: "AZ", name: "Arizona" },
      { code: "AR", name: "Arkansas" },
      { code: "CA", name: "California" },
      { code: "CO", name: "Colorado" },
      { code: "CT", name: "Connecticut" },
      { code: "DE", name: "Delaware" },
      { code: "DC", name: "District of Columbia" },
      { code: "FL", name: "Florida" },
      { code: "GA", name: "Georgia" },
      { code: "GU", name: "Guam" },
      { code: "HI", name: "Hawaii" },
      { code: "ID", name: "Idaho" },
      { code: "IL", name: "Illinois" },
      { code: "IN", name: "Indiana" },
      { code: "IA", name: "Iowa" },
      { code: "KS", name: "Kansas" },
      { code: "KY", name: "Kentucky" },
      { code: "LA", name: "Louisiana" },
      { code: "ME", name: "Maine" },
      { code: "MD", name: "Maryland" },
      { code: "MA", name: "Massachusetts" },
      { code: "MI", name: "Michigan" },
      { code: "MN", name: "Minnesota" },
      { code: "MS", name: "Mississippi" },
      { code: "MO", name: "Missouri" },
      { code: "MT", name: "Montana" },
      { code: "NE", name: "Nebraska" },
      { code: "NV", name: "Nevada" },
      { code: "NH", name: "New Hampshire" },
      { code: "NJ", name: "New Jersey" },
      { code: "NM", name: "New Mexico" },
      { code: "NY", name: "New York" },
      { code: "NC", name: "North Carolina" },
      { code: "ND", name: "North Dakota" },
      { code: "MP", name: "Northern Mariana Islands" },
      { code: "OH", name: "Ohio" },
      { code: "OK", name: "Oklahoma" },
      { code: "OR", name: "Oregon" },
      { code: "PA", name: "Pennsylvania" },
      { code: "PR", name: "Puerto Rico" },
      { code: "RI", name: "Rhode Island" },
      { code: "SC", name: "South Carolina" },
      { code: "SD", name: "South Dakota" },
      { code: "TN", name: "Tennessee" },
      { code: "TX", name: "Texas" },
      { code: "UM", name: "United States Minor Outlying Islands" },
      { code: "UT", name: "Utah" },
      { code: "VT", name: "Vermont" },
      { code: "VI", name: "Virgin Islands, U.S." },
      { code: "VA", name: "Virginia" },
      { code: "WA", name: "Washington" },
      { code: "WV", name: "West Virginia" },
      { code: "WI", name: "Wisconsin" },
      { code: "WY", name: "Wyoming" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag_emoji: "🇬🇧",
    state_label: "Country",
    has_policy: true,
    states: [
      { code: "ENG", name: "England" },
      { code: "NIR", name: "Northern Ireland" },
      { code: "SCT", name: "Scotland" },
      { code: "WLS", name: "Wales" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    flag_emoji: "🇦🇺",
    state_label: "State",
    has_policy: true,
    states: [
      { code: "ACT", name: "Australian Capital Territory" },
      { code: "NSW", name: "New South Wales" },
      { code: "NT", name: "Northern Territory" },
      { code: "QLD", name: "Queensland" },
      { code: "SA", name: "South Australia" },
      { code: "TAS", name: "Tasmania" },
      { code: "VIC", name: "Victoria" },
      { code: "WA", name: "Western Australia" },
    ],
  },
  {
    code: "IN",
    name: "India",
    flag_emoji: "🇮🇳",
    state_label: "State",
    has_policy: true,
    states: [
      { code: "AN", name: "Andaman and Nicobar Islands" },
      { code: "AP", name: "Andhra Pradesh" },
      { code: "AR", name: "Arunāchal Pradesh" },
      { code: "AS", name: "Assam" },
      { code: "BR", name: "Bihār" },
      { code: "CH", name: "Chandīgarh" },
      { code: "CG", name: "Chhattīsgarh" },
      { code: "DL", name: "Delhi" },
      { code: "DH", name: "Dādra and Nagar Haveli and Damān and Diu" },
      { code: "GA", name: "Goa" },
      { code: "GJ", name: "Gujarāt" },
      { code: "HR", name: "Haryāna" },
      { code: "HP", name: "Himāchal Pradesh" },
      { code: "JK", name: "Jammu and Kashmīr" },
      { code: "JH", name: "Jhārkhand" },
      { code: "KA", name: "Karnātaka" },
      { code: "KL", name: "Kerala" },
      { code: "LA", name: "Ladākh" },
      { code: "LD", name: "Lakshadweep" },
      { code: "MP", name: "Madhya Pradesh" },
      { code: "MH", name: "Mahārāshtra" },
      { code: "MN", name: "Manipur" },
      { code: "ML", name: "Meghālaya" },
      { code: "MZ", name: "Mizoram" },
      { code: "NL", name: "Nāgāland" },
      { code: "OD", name: "Odisha" },
      { code: "PY", name: "Puducherry" },
      { code: "PB", name: "Punjab" },
      { code: "RJ", name: "Rājasthān" },
      { code: "SK", name: "Sikkim" },
      { code: "TN", name: "Tamil Nādu" },
      { code: "TS", name: "Telangāna" },
      { code: "TR", name: "Tripura" },
      { code: "UP", name: "Uttar Pradesh" },
      { code: "UK", name: "Uttarākhand" },
      { code: "WB", name: "West Bengal" },
    ],
  }
];
