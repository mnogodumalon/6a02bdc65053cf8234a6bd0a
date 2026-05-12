// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface SchlaglochMelden {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    foto?: string;
    standort?: GeoLocation; // { lat, long, info }
    schweregrad?: LookupValue;
    beschreibung?: string;
    meldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    melder_vorname?: string;
    melder_nachname?: string;
    melder_email?: string;
    melder_telefon?: string;
  };
}

export const APP_IDS = {
  SCHLAGLOCH_MELDEN: '6a02bdb3bca9138b0a3e6dc4',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'schlagloch_melden': {
    schweregrad: [{ key: "gering", label: "Gering (kleine Unebenheit)" }, { key: "mittel", label: "Mittel (deutliches Schlagloch)" }, { key: "hoch", label: "Hoch (gefährliches Schlagloch)" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'schlagloch_melden': {
    'foto': 'file',
    'standort': 'geo',
    'schweregrad': 'lookup/radio',
    'beschreibung': 'string/textarea',
    'meldedatum': 'date/datetimeminute',
    'melder_vorname': 'string/text',
    'melder_nachname': 'string/text',
    'melder_email': 'string/email',
    'melder_telefon': 'string/tel',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSchlaglochMelden = StripLookup<SchlaglochMelden['fields']>;