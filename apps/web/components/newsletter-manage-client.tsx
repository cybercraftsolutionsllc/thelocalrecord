"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { contentApiBase } from "../lib/public-config";

type ManagePayload = {
  ok: boolean;
  subscription?: {
    municipalitySlug: string;
    email: string;
    displayName?: string | null;
    status: string;
    frequency: string;
  };
};

export function NewsletterManageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<ManagePayload["subscription"] | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!token || !contentApiBase) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `${contentApiBase}/api/newsletter/manage?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load subscription");
        }

        const payload = (await response.json()) as ManagePayload;

        if (!cancelled) {
          setSubscription(payload.subscription ?? null);
          setDisplayName(payload.subscription?.displayName ?? "");
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function updateSubscription(action: "save" | "unsubscribe" | "resubscribe") {
    if (!token || !contentApiBase) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${contentApiBase}/api/newsletter/manage?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action,
            displayName
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update subscription");
      }

      const payload = (await response.json()) as ManagePayload;
      setSubscription(payload.subscription ?? null);
      setDisplayName(payload.subscription?.displayName ?? "");
      setStatus("ready");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
        Loading subscription settings...
      </div>
    );
  }

  if (status === "error" || !subscription) {
    return (
      <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
        <h1 className="font-serif text-3xl text-moss">Subscription link not found</h1>
        <p className="mt-3 max-w-2xl text-base leading-8 text-ink/75">
          This newsletter management link is missing or invalid. Try subscribing
          again from the locality page.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
        Newsletter settings
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-moss">
        Manage your weekly digest
      </h1>
      <p className="mt-4 text-base leading-8 text-ink/75">
        You&apos;re subscribed for <strong>{subscription.email}</strong>.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-moss">
            First name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Optional"
            className="w-full rounded-[1.25rem] border border-ink/10 bg-sand/35 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss/30 focus:bg-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void updateSubscription("save")}
          disabled={saving}
          className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-moss/10 bg-sand/30 p-5 text-sm leading-7 text-ink/75">
        Status:{" "}
        <span className="font-semibold text-moss">
          {subscription.status === "active" ? "Subscribed" : "Unsubscribed"}
        </span>
        <br />
        Frequency: <span className="font-semibold text-moss">Weekly</span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {subscription.status === "active" ? (
          <button
            type="button"
            onClick={() => void updateSubscription("unsubscribe")}
            disabled={saving}
            className="rounded-full border border-clay/30 bg-white px-5 py-3 text-sm font-semibold text-clay transition hover:bg-[#fbf8f2] disabled:opacity-50"
          >
            Unsubscribe
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void updateSubscription("resubscribe")}
            disabled={saving}
            className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:opacity-50"
          >
            Resubscribe
          </button>
        )}
      </div>
    </div>
  );
}
