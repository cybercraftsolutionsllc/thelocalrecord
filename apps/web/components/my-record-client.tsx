"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";

import {
  createAppleProvider,
  createGoogleProvider,
  firebaseConfigured,
  getAuthClient
} from "../lib/firebase";
import { residentCommunities } from "../lib/resident-communities";
import {
  parseSourceLinks,
  residentApiFetch,
  type NearbyEntry,
  type ResidentSnapshot,
  type SavedPlace,
  type Watchlist
} from "../lib/resident-api";

type ApiSnapshotResponse = {
  ok: boolean;
  resident: ResidentSnapshot;
};

type ApiPlacesResponse = {
  ok: boolean;
  savedPlace: SavedPlace;
};

type ApiWatchlistResponse = {
  ok: boolean;
  watchlist: Watchlist;
};

type ApiNearbyResponse = {
  ok: boolean;
  entries: NearbyEntry[];
};

type DemoState = {
  savedPlaces: SavedPlace[];
  watchlists: Watchlist[];
};

const demoStorageKey = "thelocalrecord:my-record-demo";
const defaultMunicipalitySlug = "manheimtownshippa";
const emptySavedPlaces: SavedPlace[] = [];
const emptyWatchlists: Watchlist[] = [];

const starterWatchTopics = [
  "Road closures",
  "Planning Commission",
  "Permits and code",
  "Parks",
  "Public notices"
];

export function MyRecordClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [snapshot, setSnapshot] = useState<ResidentSnapshot | null>(null);
  const [nearby, setNearby] = useState<NearbyEntry[]>([]);
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [placeForm, setPlaceForm] = useState({
    label: "Home",
    rawAddress: "",
    municipalitySlug: defaultMunicipalitySlug
  });
  const [watchForm, setWatchForm] = useState({
    label: "Roads near me",
    query: "",
    topic: "Road closures",
    notificationLevel: "important",
    savedPlaceId: ""
  });

  const isDemo = Boolean(demoState);
  const savedPlaces =
    demoState?.savedPlaces ?? snapshot?.savedPlaces ?? emptySavedPlaces;
  const watchlists =
    demoState?.watchlists ?? snapshot?.watchlists ?? emptyWatchlists;
  const profileEmail =
    user?.email ?? snapshot?.profile?.email ?? "local-demo@thelocalrecord.test";
  const canUsePrivateApi = firebaseConfigured && Boolean(user);

  const hydrate = useCallback(async (firebaseUser: User) => {
    setError("");
    const token = await firebaseUser.getIdToken();
    const [residentResponse, nearbyResponse] = await Promise.all([
      residentApiFetch<ApiSnapshotResponse>("/api/me", token),
      residentApiFetch<ApiNearbyResponse>("/api/me/nearby", token)
    ]);

    setSnapshot(residentResponse.resident);
    setNearby(nearbyResponse.entries);
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) {
      return;
    }

    const auth = getAuthClient();

    if (!auth) {
      return;
    }

    const completeEmailLink = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        return;
      }

      const storedEmail =
        window.localStorage.getItem("thelocalrecord:email-link") ?? "";
      const emailForLink =
        storedEmail || window.prompt("Email for sign-in link") || "";

      if (!emailForLink) {
        return;
      }

      await signInWithEmailLink(auth, emailForLink, window.location.href);
      window.localStorage.removeItem("thelocalrecord:email-link");
      window.history.replaceState(null, "", "/my-record");
      setStatus("Signed in.");
    };

    completeEmailLink().catch((authError: unknown) => {
      setError(
        authError instanceof Error
          ? authError.message
          : "Could not finish email sign-in."
      );
    });

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        hydrate(nextUser).catch((apiError: unknown) => {
          setError(
            apiError instanceof Error
              ? apiError.message
              : "Could not load My Record."
          );
        });
      } else {
        setSnapshot(null);
        setNearby([]);
      }
    });
  }, [hydrate]);

  useEffect(() => {
    if (!demoState) {
      return;
    }

    window.localStorage.setItem(demoStorageKey, JSON.stringify(demoState));
  }, [demoState]);

  const suggestedQueries = useMemo(() => {
    const place = savedPlaces[0];

    return [place?.raw_address, place?.zip, ...starterWatchTopics].filter(
      (item): item is string => Boolean(item)
    );
  }, [savedPlaces]);

  async function sendEmailLink() {
    const auth = getAuthClient();

    if (!auth || !email) {
      return;
    }

    await sendSignInLinkToEmail(auth, email, {
      url: `${window.location.origin}/my-record`,
      handleCodeInApp: true
    });
    window.localStorage.setItem("thelocalrecord:email-link", email);
    setStatus("Check your email for a sign-in link.");
  }

  async function signInWithProvider(providerName: "google" | "apple") {
    const auth = getAuthClient();

    if (!auth) {
      return;
    }

    const provider =
      providerName === "google"
        ? createGoogleProvider()
        : createAppleProvider();
    await signInWithPopup(auth, provider);
  }

  function startDemo() {
    const stored = window.localStorage.getItem(demoStorageKey);

    if (stored) {
      try {
        setDemoState(JSON.parse(stored) as DemoState);
        return;
      } catch {
        window.localStorage.removeItem(demoStorageKey);
      }
    }

    setDemoState({
      savedPlaces: [],
      watchlists: []
    });
  }

  async function handleCreatePlace() {
    setError("");
    const rawAddress = placeForm.rawAddress.trim();

    if (!rawAddress || !placeForm.label.trim()) {
      setError("Add a label and address or ZIP.");
      return;
    }

    if (isDemo) {
      const now = new Date().toISOString();
      const place: SavedPlace = {
        id: crypto.randomUUID(),
        label: placeForm.label.trim(),
        raw_address: rawAddress,
        normalized_address: rawAddress.replace(/\s+/g, " ").trim(),
        zip: rawAddress.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] ?? null,
        municipality_slug: placeForm.municipalitySlug,
        lat: null,
        lng: null,
        geocode_confidence: null,
        created_at: now,
        updated_at: now
      };

      setDemoState((current) => ({
        savedPlaces: [place, ...(current?.savedPlaces ?? [])],
        watchlists: current?.watchlists ?? []
      }));
      setWatchForm((current) => ({
        ...current,
        query: rawAddress,
        savedPlaceId: place.id
      }));
      setPlaceForm((current) => ({ ...current, rawAddress: "" }));
      return;
    }

    if (!user) {
      setError("Sign in before saving a private place.");
      return;
    }

    const token = await user.getIdToken();
    const response = await residentApiFetch<ApiPlacesResponse>(
      "/api/me/places",
      token,
      {
        method: "POST",
        body: JSON.stringify({
          label: placeForm.label,
          rawAddress,
          municipalitySlug: placeForm.municipalitySlug
        })
      }
    );

    await hydrate(user);
    setWatchForm((current) => ({
      ...current,
      query: rawAddress,
      savedPlaceId: response.savedPlace.id
    }));
    setPlaceForm((current) => ({ ...current, rawAddress: "" }));
  }

  async function handleCreateWatchlist(queryOverride?: string) {
    setError("");
    const query = (queryOverride ?? watchForm.query).trim();

    if (!query || !watchForm.label.trim()) {
      setError(
        "Add a watchlist label and a topic, address, street, or project."
      );
      return;
    }

    const selectedPlace = savedPlaces.find(
      (place) => place.id === watchForm.savedPlaceId
    );
    const municipalitySlug =
      selectedPlace?.municipality_slug ?? placeForm.municipalitySlug;

    if (isDemo) {
      const now = new Date().toISOString();
      const watchlist: Watchlist = {
        id: crypto.randomUUID(),
        saved_place_id: selectedPlace?.id ?? null,
        municipality_slug: municipalitySlug,
        label: watchForm.label.trim(),
        query,
        topic: watchForm.topic,
        status: "active",
        notification_level: watchForm.notificationLevel,
        created_at: now,
        updated_at: now
      };

      setDemoState((current) => ({
        savedPlaces: current?.savedPlaces ?? [],
        watchlists: [watchlist, ...(current?.watchlists ?? [])]
      }));
      setWatchForm((current) => ({ ...current, query: "" }));
      return;
    }

    if (!user) {
      setError("Sign in before saving a watchlist.");
      return;
    }

    const token = await user.getIdToken();
    await residentApiFetch<ApiWatchlistResponse>("/api/me/watchlists", token, {
      method: "POST",
      body: JSON.stringify({
        label: watchForm.label,
        query,
        topic: watchForm.topic,
        notificationLevel: watchForm.notificationLevel,
        municipalitySlug,
        savedPlaceId: selectedPlace?.id ?? null
      })
    });

    await hydrate(user);
    setWatchForm((current) => ({ ...current, query: "" }));
  }

  async function removePlace(placeId: string) {
    if (isDemo) {
      setDemoState((current) => ({
        savedPlaces: (current?.savedPlaces ?? []).filter(
          (place) => place.id !== placeId
        ),
        watchlists: (current?.watchlists ?? []).filter(
          (watchlist) => watchlist.saved_place_id !== placeId
        )
      }));
      return;
    }

    if (!user) {
      return;
    }

    const token = await user.getIdToken();
    await residentApiFetch(`/api/me/places/${placeId}`, token, {
      method: "DELETE"
    });
    await hydrate(user);
  }

  async function removeWatchlist(watchlistId: string) {
    if (isDemo) {
      setDemoState((current) => ({
        savedPlaces: current?.savedPlaces ?? [],
        watchlists: (current?.watchlists ?? []).filter(
          (watchlist) => watchlist.id !== watchlistId
        )
      }));
      return;
    }

    if (!user) {
      return;
    }

    const token = await user.getIdToken();
    await residentApiFetch(`/api/me/watchlists/${watchlistId}`, token, {
      method: "DELETE"
    });
    await hydrate(user);
  }

  async function toggleEmailPreference() {
    if (!user || !snapshot?.preferences) {
      return;
    }

    const token = await user.getIdToken();
    await residentApiFetch("/api/me/preferences", token, {
      method: "PATCH",
      body: JSON.stringify({
        emailEnabled: snapshot.preferences.email_enabled !== 1
      })
    });
    await hydrate(user);
  }

  async function refreshNearMe() {
    if (!user) {
      return;
    }

    const token = await user.getIdToken();
    const response = await residentApiFetch<ApiNearbyResponse>(
      "/api/me/nearby",
      token
    );
    setNearby(response.entries);
  }

  if (!authReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-[1rem] border border-ink/10 bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            My Record
          </p>
          <h1 className="mt-2 font-serif text-4xl text-moss">
            Loading sign-in...
          </h1>
        </div>
      </div>
    );
  }

  if (!canUsePrivateApi && !isDemo) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:py-12">
        <section className="rounded-[1rem] bg-[#183f47] p-6 text-white shadow-card sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#aee4ef]">
            My Record
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-tight">
            A private resident console for places and watchlists.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/78">
            Save your property, ZIP, street, or project. The Local Record checks
            source-linked local records against what you care about and keeps
            the official trail one tap away.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              "Private saved places",
              "Watchlist alerts",
              "Source observed"
            ].map((item) => (
              <div
                key={item}
                className="border-t border-white/20 pt-3 text-sm text-white/80"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1rem] border border-white/75 bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Sign in
          </p>
          {firebaseConfigured ? (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                  placeholder="you@example.com"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  sendEmailLink().catch((sendError: unknown) => {
                    setError(
                      sendError instanceof Error
                        ? sendError.message
                        : "Could not send link."
                    );
                  });
                }}
                className="w-full rounded-[0.75rem] bg-moss px-4 py-3 text-sm font-bold text-white transition hover:bg-[#183f47]"
              >
                Email me a magic link
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    signInWithProvider("google").catch(
                      (providerError: unknown) => {
                        setError(
                          providerError instanceof Error
                            ? providerError.message
                            : "Google sign-in failed."
                        );
                      }
                    );
                  }}
                  className="rounded-[0.75rem] border border-ink/10 bg-[#fcfaf4] px-4 py-3 text-sm font-semibold text-ink transition hover:border-moss/25 hover:bg-sky/40"
                >
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={() => {
                    signInWithProvider("apple").catch(
                      (providerError: unknown) => {
                        setError(
                          providerError instanceof Error
                            ? providerError.message
                            : "Apple sign-in failed."
                        );
                      }
                    );
                  }}
                  className="rounded-[0.75rem] border border-ink/10 bg-[#fcfaf4] px-4 py-3 text-sm font-semibold text-ink transition hover:border-moss/25 hover:bg-sky/40"
                >
                  Continue with Apple
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[0.9rem] border border-clay/20 bg-[#fff8ee] p-4 text-sm leading-7 text-ink/72">
              Firebase public config is not set for this build. Production
              sign-in stays disabled until the project adds the Firebase web
              keys and Worker token verification settings.
            </div>
          )}
          <button
            type="button"
            onClick={startDemo}
            className="mt-4 w-full rounded-[0.75rem] border border-moss/15 bg-sand/50 px-4 py-3 text-sm font-semibold text-moss transition hover:bg-sky/45"
          >
            Try local demo
          </button>
          {status ? <p className="mt-4 text-sm text-moss">{status}</p> : null}
          {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <section className="grid gap-5 rounded-[1rem] bg-[#183f47] p-5 text-white shadow-card sm:p-7 lg:grid-cols-[1fr_0.72fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#aee4ef]">
            My Record
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
            What affects me?
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/78">
            Signed in as {profileEmail}. Saved places are private account data.
            Alerts are source-observed watchlist matches, not official emergency
            delivery.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Metric label="Saved places" value={savedPlaces.length} />
          <Metric label="Watchlists" value={watchlists.length} />
          <Metric
            label="Near me"
            value={nearby.length || suggestedQueries.length}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-[0.85rem] border border-clay/20 bg-[#fff8ee] px-4 py-3 text-sm text-clay">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-[1rem] border border-white/75 bg-white p-5 shadow-card sm:p-6">
            <SectionHeading
              eyebrow="Saved places"
              title="Add your property, ZIP, or street"
            />
            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">Label</span>
                <input
                  value={placeForm.label}
                  onChange={(event) =>
                    setPlaceForm((current) => ({
                      ...current,
                      label: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">
                  Address or ZIP
                </span>
                <input
                  value={placeForm.rawAddress}
                  onChange={(event) =>
                    setPlaceForm((current) => ({
                      ...current,
                      rawAddress: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                  placeholder="120 Kreider Ave, 17601, Lititz Pike..."
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">
                  Community
                </span>
                <select
                  value={placeForm.municipalitySlug}
                  onChange={(event) =>
                    setPlaceForm((current) => ({
                      ...current,
                      municipalitySlug: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                >
                  {residentCommunities.map((municipality) => (
                    <option key={municipality.slug} value={municipality.slug}>
                      {municipality.shortName}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-6 text-ink/58">
                Precise places stay in your account and can be deleted. The
                first release stores the address text and community; geocoding
                can be added behind the same private saved-place record.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleCreatePlace().catch((placeError: unknown) => {
                    setError(
                      placeError instanceof Error
                        ? placeError.message
                        : "Could not save place."
                    );
                  });
                }}
                className="w-full rounded-[0.75rem] bg-moss px-4 py-3 text-sm font-bold text-white transition hover:bg-[#183f47]"
              >
                Save place
              </button>
            </div>
          </section>

          <section className="rounded-[1rem] border border-white/75 bg-white p-5 shadow-card sm:p-6">
            <SectionHeading
              eyebrow="Notifications"
              title="Quiet, watchlist-first alerts"
            />
            <div className="mt-5 space-y-3 text-sm leading-7 text-ink/72">
              <p>
                Email alerts are{" "}
                {snapshot?.preferences?.email_enabled === 0 ? "off" : "on"}.
                Push registration is ready for the mobile wrapper after
                production sign-in and push tokens are stable.
              </p>
              {!isDemo ? (
                <button
                  type="button"
                  onClick={() => {
                    toggleEmailPreference().catch((prefError: unknown) => {
                      setError(
                        prefError instanceof Error
                          ? prefError.message
                          : "Could not update preferences."
                      );
                    });
                  }}
                  className="rounded-[0.75rem] border border-moss/15 bg-sand/45 px-4 py-3 text-sm font-semibold text-moss transition hover:bg-sky/45"
                >
                  Toggle email alerts
                </button>
              ) : null}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[1rem] border border-white/75 bg-white p-5 shadow-card sm:p-6">
            <SectionHeading eyebrow="Watchlists" title="Track what matters" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">Label</span>
                <input
                  value={watchForm.label}
                  onChange={(event) =>
                    setWatchForm((current) => ({
                      ...current,
                      label: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">
                  Saved place
                </span>
                <select
                  value={watchForm.savedPlaceId}
                  onChange={(event) =>
                    setWatchForm((current) => ({
                      ...current,
                      savedPlaceId: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                >
                  <option value="">No place attached</option>
                  {savedPlaces.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-ink/74">
                  Topic, street, or project
                </span>
                <input
                  value={watchForm.query}
                  onChange={(event) =>
                    setWatchForm((current) => ({
                      ...current,
                      query: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                  placeholder="Route 30, Ashford Meadows, zoning hearing..."
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">Lane</span>
                <select
                  value={watchForm.topic}
                  onChange={(event) =>
                    setWatchForm((current) => ({
                      ...current,
                      topic: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                >
                  {starterWatchTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink/74">
                  Notify for
                </span>
                <select
                  value={watchForm.notificationLevel}
                  onChange={(event) =>
                    setWatchForm((current) => ({
                      ...current,
                      notificationLevel: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-[0.75rem] border border-ink/10 bg-sand/35 px-4 py-3 outline-none focus:border-moss/30 focus:bg-white"
                >
                  <option value="important">Important and above</option>
                  <option value="critical_source">Critical source only</option>
                  <option value="routine">Everything matching</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                handleCreateWatchlist().catch((watchError: unknown) => {
                  setError(
                    watchError instanceof Error
                      ? watchError.message
                      : "Could not save watchlist."
                  );
                });
              }}
              className="mt-4 w-full rounded-[0.75rem] bg-moss px-4 py-3 text-sm font-bold text-white transition hover:bg-[#183f47]"
            >
              Save watchlist
            </button>
          </section>

          <section className="rounded-[1rem] border border-white/75 bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeading
                eyebrow="Latest near me"
                title="Source-linked matches"
              />
              {!isDemo ? (
                <button
                  type="button"
                  onClick={() => {
                    refreshNearMe().catch((nearError: unknown) => {
                      setError(
                        nearError instanceof Error
                          ? nearError.message
                          : "Could not refresh nearby records."
                      );
                    });
                  }}
                  className="rounded-[0.75rem] border border-moss/15 bg-sand/45 px-4 py-2 text-sm font-semibold text-moss transition hover:bg-sky/45"
                >
                  Refresh
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-3">
              {isDemo ? (
                suggestedQueries.slice(0, 5).map((query) => (
                  <Link
                    key={query}
                    href={`/${placeForm.municipalitySlug}?q=${encodeURIComponent(query)}#records`}
                    className="block rounded-[0.85rem] border border-ink/10 bg-sand/35 p-4 transition hover:border-moss/20 hover:bg-sky/40"
                  >
                    <p className="text-sm font-semibold text-moss">{query}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/58">
                      Open the public source search for this demo watch.
                    </p>
                  </Link>
                ))
              ) : nearby.length > 0 ? (
                nearby.map((entry) => {
                  const source = parseSourceLinks(entry.source_links_json)[0];

                  return (
                    <article
                      key={entry.id}
                      className="rounded-[0.85rem] border border-ink/10 bg-[#fcfaf4] p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-sky px-2.5 py-1 text-xs font-semibold text-moss">
                          {entry.match_reason}
                        </span>
                        <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-semibold text-clay">
                          {entry.impact_level.replace("_", " ")}
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-2xl leading-tight text-moss">
                        {entry.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-ink/70">
                        {entry.summary}
                      </p>
                      {source ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-semibold text-moss"
                        >
                          Open official source
                        </a>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <p className="rounded-[0.85rem] border border-dashed border-ink/15 bg-sand/25 p-4 text-sm leading-7 text-ink/62">
                  Add a place or watchlist, then refresh. If nothing matches,
                  the current source set has no published records for that
                  query.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <RecordList
          title="Saved places"
          empty="No saved places yet."
          items={savedPlaces.map((place) => ({
            id: place.id,
            title: place.label,
            body: `${place.raw_address} - ${municipalityLabel(place.municipality_slug)}`,
            actionLabel: "Delete",
            onAction: () => removePlace(place.id)
          }))}
        />
        <RecordList
          title="Watchlists"
          empty="No watchlists yet."
          items={watchlists.map((watchlist) => ({
            id: watchlist.id,
            title: watchlist.label,
            body: `${watchlist.query} - ${watchlist.topic ?? "General"} - ${
              watchlist.notification_level
            }`,
            actionLabel: "Delete",
            onAction: () => removeWatchlist(watchlist.id)
          }))}
        />
      </section>

      <div className="flex flex-wrap gap-3">
        {!isDemo && user ? (
          <button
            type="button"
            onClick={() => {
              const auth = getAuthClient();
              if (auth) {
                signOut(auth).catch(() => undefined);
              }
            }}
            className="rounded-[0.75rem] border border-ink/10 bg-[#fcfaf4] px-4 py-3 text-sm font-semibold text-ink/74 transition hover:bg-sky/40"
          >
            Sign out
          </button>
        ) : null}
        {isDemo ? (
          <button
            type="button"
            onClick={() => setDemoState(null)}
            className="rounded-[0.75rem] border border-ink/10 bg-[#fcfaf4] px-4 py-3 text-sm font-semibold text-ink/74 transition hover:bg-sky/40"
          >
            Exit demo
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-moss">
        {title}
      </h2>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[0.85rem] border border-white/12 bg-white/10 px-4 py-3">
      <p className="font-serif text-3xl leading-none text-sand">{value}</p>
      <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sky">
        {label}
      </p>
    </div>
  );
}

function RecordList({
  title,
  empty,
  items
}: {
  title: string;
  empty: string;
  items: Array<{
    id: string;
    title: string;
    body: string;
    actionLabel: string;
    onAction: () => void | Promise<void>;
  }>;
}) {
  return (
    <section className="rounded-[1rem] border border-white/75 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-serif text-3xl leading-tight text-moss">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-ink/60">{empty}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-[0.85rem] border border-ink/10 bg-sand/30 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-moss">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/62">
                  {item.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  Promise.resolve(item.onAction()).catch(() => undefined);
                }}
                className="rounded-[0.7rem] border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-clay transition hover:bg-[#fff8ee]"
              >
                {item.actionLabel}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function municipalityLabel(slug: string) {
  return (
    residentCommunities.find((municipality) => municipality.slug === slug)
      ?.shortName ?? slug
  );
}
