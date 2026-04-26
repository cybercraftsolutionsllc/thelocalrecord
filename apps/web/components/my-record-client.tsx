"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";
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
      <PageWrap>
        <Panel>
          <p className="text-sm text-ink/60">Loading sign-in...</p>
        </Panel>
      </PageWrap>
    );
  }

  if (!canUsePrivateApi && !isDemo) {
    return (
      <PageWrap>
        <section className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-moss">My Record</p>
            <h1 className="mt-3 font-serif text-5xl leading-none text-ink sm:text-6xl">
              Save your place. Watch what changes.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/64">
              Keep addresses private, track topics, and open official sources
              when something matches.
            </p>
          </div>

          <AuthPanel
            email={email}
            error={error}
            firebaseConfigured={firebaseConfigured}
            onEmailChange={setEmail}
            onSendEmailLink={() => {
              sendEmailLink().catch((sendError: unknown) => {
                setError(
                  sendError instanceof Error
                    ? sendError.message
                    : "Could not send link."
                );
              });
            }}
            onGoogle={() => {
              signInWithProvider("google").catch((providerError: unknown) => {
                setError(
                  providerError instanceof Error
                    ? providerError.message
                    : "Google sign-in failed."
                );
              });
            }}
            onApple={() => {
              signInWithProvider("apple").catch((providerError: unknown) => {
                setError(
                  providerError instanceof Error
                    ? providerError.message
                    : "Apple sign-in failed."
                );
              });
            }}
            onDemo={startDemo}
            status={status}
          />
        </section>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <section className="border-b border-ink/10 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-moss">My Record</p>
            <h1 className="mt-2 font-serif text-5xl leading-none text-ink">
              What affects me?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60">
              Signed in as {profileEmail}. Saved places stay private.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            {!isDemo && user ? (
              <button
                type="button"
                onClick={() => {
                  const auth = getAuthClient();
                  if (auth) {
                    signOut(auth).catch(() => undefined);
                  }
                }}
                className="rounded-md border border-ink/10 px-3 py-2 text-ink/68 transition hover:border-moss/25 hover:text-moss"
              >
                Sign out
              </button>
            ) : null}
            {isDemo ? (
              <button
                type="button"
                onClick={() => setDemoState(null)}
                className="rounded-md border border-ink/10 px-3 py-2 text-ink/68 transition hover:border-moss/25 hover:text-moss"
              >
                Exit demo
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-clay/20 bg-white px-4 py-3 text-sm text-clay">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-6">
          <NearbyPanel
            isDemo={isDemo}
            nearby={nearby}
            onRefresh={() => {
              refreshNearMe().catch((nearError: unknown) => {
                setError(
                  nearError instanceof Error
                    ? nearError.message
                    : "Could not refresh nearby records."
                );
              });
            }}
            placeFormMunicipalitySlug={placeForm.municipalitySlug}
            suggestedQueries={suggestedQueries}
          />

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
              body: `${watchlist.query} - ${watchlist.topic ?? "General"}`,
              actionLabel: "Delete",
              onAction: () => removeWatchlist(watchlist.id)
            }))}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <PlacePanel
            placeForm={placeForm}
            onPlaceFormChange={setPlaceForm}
            onCreatePlace={() => {
              handleCreatePlace().catch((placeError: unknown) => {
                setError(
                  placeError instanceof Error
                    ? placeError.message
                    : "Could not save place."
                );
              });
            }}
          />

          <WatchPanel
            savedPlaces={savedPlaces}
            watchForm={watchForm}
            onWatchFormChange={setWatchForm}
            onCreateWatchlist={() => {
              handleCreateWatchlist().catch((watchError: unknown) => {
                setError(
                  watchError instanceof Error
                    ? watchError.message
                    : "Could not save watchlist."
                );
              });
            }}
          />

          <Panel>
            <p className="text-sm font-semibold text-moss">Notifications</p>
            <p className="mt-2 text-sm leading-6 text-ink/62">
              Email alerts are{" "}
              {snapshot?.preferences?.email_enabled === 0 ? "off" : "on"}.
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
                className="mt-4 w-full rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky/45"
              >
                Toggle email alerts
              </button>
            ) : null}
          </Panel>
        </aside>
      </section>
    </PageWrap>
  );
}

function PageWrap({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      {children}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5">
      {children}
    </section>
  );
}

function AuthPanel({
  email,
  error,
  firebaseConfigured,
  onApple,
  onDemo,
  onEmailChange,
  onGoogle,
  onSendEmailLink,
  status
}: {
  email: string;
  error: string;
  firebaseConfigured: boolean;
  onApple: () => void;
  onDemo: () => void;
  onEmailChange: (value: string) => void;
  onGoogle: () => void;
  onSendEmailLink: () => void;
  status: string;
}) {
  return (
    <Panel>
      <p className="text-sm font-semibold text-moss">Sign in</p>
      {firebaseConfigured ? (
        <div className="mt-4 space-y-3">
          <input
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            type="email"
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
            placeholder="you@example.com"
          />
          <button
            type="button"
            onClick={onSendEmailLink}
            className="h-11 w-full rounded-lg bg-moss px-4 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Email magic link
          </button>
          <button
            type="button"
            onClick={onGoogle}
            className="h-11 w-full rounded-lg border border-ink/10 px-4 text-sm font-semibold text-ink/72 transition hover:border-moss/25 hover:text-moss"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={onApple}
            className="h-11 w-full rounded-lg border border-ink/10 px-4 text-sm font-semibold text-ink/72 transition hover:border-moss/25 hover:text-moss"
          >
            Continue with Apple
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink/62">
          Firebase sign-in is not configured for this build.
        </p>
      )}
      <button
        type="button"
        onClick={onDemo}
        className="mt-3 h-11 w-full rounded-lg border border-ink/10 px-4 text-sm font-semibold text-moss transition hover:bg-sky/45"
      >
        Try demo
      </button>
      {status ? <p className="mt-3 text-sm text-moss">{status}</p> : null}
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
    </Panel>
  );
}

function PlacePanel({
  placeForm,
  onCreatePlace,
  onPlaceFormChange
}: {
  placeForm: {
    label: string;
    rawAddress: string;
    municipalitySlug: string;
  };
  onCreatePlace: () => void;
  onPlaceFormChange: Dispatch<
    SetStateAction<{
      label: string;
      rawAddress: string;
      municipalitySlug: string;
    }>
  >;
}) {
  return (
    <Panel>
      <p className="text-sm font-semibold text-moss">Save a place</p>
      <div className="mt-4 space-y-3">
        <input
          value={placeForm.label}
          onChange={(event) =>
            onPlaceFormChange((current) => ({
              ...current,
              label: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
          placeholder="Label"
        />
        <input
          value={placeForm.rawAddress}
          onChange={(event) =>
            onPlaceFormChange((current) => ({
              ...current,
              rawAddress: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
          placeholder="Address, ZIP, street..."
        />
        <select
          value={placeForm.municipalitySlug}
          onChange={(event) =>
            onPlaceFormChange((current) => ({
              ...current,
              municipalitySlug: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
        >
          {residentCommunities.map((municipality) => (
            <option key={municipality.slug} value={municipality.slug}>
              {municipality.shortName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onCreatePlace}
          className="h-11 w-full rounded-lg bg-moss px-4 text-sm font-semibold text-white transition hover:bg-ink"
        >
          Save place
        </button>
      </div>
    </Panel>
  );
}

function WatchPanel({
  savedPlaces,
  watchForm,
  onCreateWatchlist,
  onWatchFormChange
}: {
  savedPlaces: SavedPlace[];
  watchForm: {
    label: string;
    query: string;
    topic: string;
    notificationLevel: string;
    savedPlaceId: string;
  };
  onCreateWatchlist: () => void;
  onWatchFormChange: Dispatch<
    SetStateAction<{
      label: string;
      query: string;
      topic: string;
      notificationLevel: string;
      savedPlaceId: string;
    }>
  >;
}) {
  return (
    <Panel>
      <p className="text-sm font-semibold text-moss">Create a watch</p>
      <div className="mt-4 space-y-3">
        <input
          value={watchForm.label}
          onChange={(event) =>
            onWatchFormChange((current) => ({
              ...current,
              label: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
          placeholder="Watch name"
        />
        <input
          value={watchForm.query}
          onChange={(event) =>
            onWatchFormChange((current) => ({
              ...current,
              query: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
          placeholder="Topic, street, project..."
        />
        <select
          value={watchForm.savedPlaceId}
          onChange={(event) =>
            onWatchFormChange((current) => ({
              ...current,
              savedPlaceId: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
        >
          <option value="">No saved place</option>
          {savedPlaces.map((place) => (
            <option key={place.id} value={place.id}>
              {place.label}
            </option>
          ))}
        </select>
        <select
          value={watchForm.topic}
          onChange={(event) =>
            onWatchFormChange((current) => ({
              ...current,
              topic: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
        >
          {starterWatchTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        <select
          value={watchForm.notificationLevel}
          onChange={(event) =>
            onWatchFormChange((current) => ({
              ...current,
              notificationLevel: event.target.value
            }))
          }
          className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss"
        >
          <option value="important">Important and above</option>
          <option value="critical_source">Critical only</option>
          <option value="routine">Every match</option>
        </select>
        <button
          type="button"
          onClick={onCreateWatchlist}
          className="h-11 w-full rounded-lg bg-moss px-4 text-sm font-semibold text-white transition hover:bg-ink"
        >
          Save watch
        </button>
      </div>
    </Panel>
  );
}

function NearbyPanel({
  isDemo,
  nearby,
  onRefresh,
  placeFormMunicipalitySlug,
  suggestedQueries
}: {
  isDemo: boolean;
  nearby: NearbyEntry[];
  onRefresh: () => void;
  placeFormMunicipalitySlug: string;
  suggestedQueries: string[];
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-moss">Latest near me</p>
          <h2 className="mt-1 font-serif text-3xl text-ink">
            Source-linked matches
          </h2>
        </div>
        {!isDemo ? (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-sky/45"
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
              href={`/${placeFormMunicipalitySlug}?q=${encodeURIComponent(query)}#records`}
              className="block rounded-md border border-ink/10 px-4 py-3 text-sm transition hover:border-moss/25"
            >
              <span className="font-semibold text-ink">{query}</span>
              <span className="mt-1 block text-ink/54">Open public search</span>
            </Link>
          ))
        ) : nearby.length > 0 ? (
          nearby.map((entry) => {
            const source = parseSourceLinks(entry.source_links_json)[0];

            return (
              <article
                key={entry.id}
                className="rounded-md border border-ink/10 px-4 py-3"
              >
                <p className="text-xs font-semibold text-moss">
                  {entry.match_reason} - {entry.impact_level.replace("_", " ")}
                </p>
                <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">
                  {entry.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/68">
                  {entry.summary}
                </p>
                {source ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold text-moss underline-offset-4 hover:underline"
                  >
                    Open source
                  </a>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="rounded-md border border-dashed border-ink/15 px-4 py-3 text-sm leading-6 text-ink/60">
            Add a place or watchlist, then refresh.
          </p>
        )}
      </div>
    </Panel>
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
    <Panel>
      <h2 className="font-serif text-3xl text-ink">{title}</h2>
      <div className="mt-4 divide-y divide-ink/8">
        {items.length === 0 ? (
          <p className="text-sm text-ink/58">{empty}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/58">
                  {item.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  Promise.resolve(item.onAction()).catch(() => undefined);
                }}
                className="rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-clay transition hover:bg-sand"
              >
                {item.actionLabel}
              </button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function municipalityLabel(slug: string) {
  return (
    residentCommunities.find((municipality) => municipality.slug === slug)
      ?.shortName ?? slug
  );
}
