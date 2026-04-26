import { contentApiBase } from "./public-config";

export type ResidentProfile = {
  id: string;
  email: string;
  display_name: string | null;
  auth_provider: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
};

export type SavedPlace = {
  id: string;
  label: string;
  raw_address: string;
  normalized_address: string;
  zip: string | null;
  municipality_slug: string;
  lat: number | null;
  lng: number | null;
  geocode_confidence: number | null;
  created_at: string;
  updated_at: string;
};

export type Watchlist = {
  id: string;
  saved_place_id: string | null;
  municipality_slug: string;
  label: string;
  query: string;
  topic: string | null;
  status: string;
  notification_level: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPreference = {
  user_id: string;
  email_enabled: number;
  push_enabled: number;
  digest_frequency: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  critical_source_enabled: number;
  updated_at: string;
};

export type NotificationEvent = {
  id: string;
  watchlist_id: string | null;
  municipality_slug: string;
  content_entry_id: string | null;
  event_kind: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

export type NearbyEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  impact_level: "critical_source" | "important" | "routine";
  source_links_json: string;
  published_at: string;
  source_material_date: string | null;
  source_name: string;
  normalized_text: string;
  match_reason: string;
};

export type ResidentSnapshot = {
  profile: ResidentProfile | null;
  savedPlaces: SavedPlace[];
  watchlists: Watchlist[];
  preferences: NotificationPreference | null;
  notificationEvents: NotificationEvent[];
};

export async function residentApiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${contentApiBase}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json().catch(() => null)) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload?.error ?? "Resident API request failed");
  }

  return payload;
}

export function parseSourceLinks(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [] as Array<{ label: string; url: string }>;
    }

    return parsed.filter((item): item is { label: string; url: string } => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.label === "string" && typeof candidate.url === "string"
      );
    });
  } catch {
    return [] as Array<{ label: string; url: string }>;
  }
}
