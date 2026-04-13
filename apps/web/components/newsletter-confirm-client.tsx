"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { contentApiBase } from "../lib/public-config";

type ConfirmLookupPayload = {
  ok: boolean;
  subscription?: {
    email: string;
    municipalitySlug: string;
    municipalityName: string;
  };
};

type ConfirmSubmitPayload = {
  ok: boolean;
  subscription?: {
    email: string;
    municipalitySlug: string;
    displayName?: string | null;
    status: string;
    frequency: string;
    manageUrl: string;
  };
};

export function NewsletterConfirmClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ready" | "confirmed" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState<ConfirmLookupPayload["subscription"] | null>(null);
  const [manageUrl, setManageUrl] = useState("");

  useEffect(() => {
    if (!token || !contentApiBase) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `${contentApiBase}/api/newsletter/confirm?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load confirmation");
        }

        const payload = (await response.json()) as ConfirmLookupPayload;

        if (!cancelled) {
          setLookup(payload.subscription ?? null);
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

  async function handleConfirm() {
    if (!token || !contentApiBase) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${contentApiBase}/api/newsletter/confirm?token=${encodeURIComponent(token)}`,
        {
          method: "POST"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to confirm");
      }

      const payload = (await response.json()) as ConfirmSubmitPayload;
      setManageUrl(payload.subscription?.manageUrl ?? "");
      setStatus("confirmed");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
        Loading confirmation details...
      </div>
    );
  }

  if (status === "error" || !lookup) {
    return (
      <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
        <h1 className="font-serif text-3xl text-moss">Confirmation link not found</h1>
        <p className="mt-3 max-w-2xl text-base leading-8 text-ink/75">
          This confirmation link is missing, expired, or invalid. Subscribe again from the locality page to get a fresh email.
        </p>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
          Subscription confirmed
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-moss">
          You&apos;re on the weekly digest
        </h1>
        <p className="mt-4 text-base leading-8 text-ink/75">
          Your email is confirmed. You can manage your subscription settings any time from the link below.
        </p>
        <a
          href={manageUrl}
          className="mt-6 inline-flex rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
        >
          Manage subscription
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
        Confirm newsletter
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-moss">
        Finish weekly digest signup
      </h1>
      <p className="mt-4 text-base leading-8 text-ink/75">
        Confirm <strong>{lookup.email}</strong> for the {lookup.municipalityName} weekly digest.
      </p>

      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={saving}
        className="mt-6 rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:opacity-50"
      >
        {saving ? "Confirming..." : "Confirm subscription"}
      </button>
    </div>
  );
}
