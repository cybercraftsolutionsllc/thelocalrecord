"use client";

import { useState } from "react";

import { contentApiBase } from "../lib/public-config";

type LocalityNewsletterBoxProps = {
  slug: string;
  municipalityName: string;
};

type SubscribeResponse = {
  ok: boolean;
  status?: string;
  email?: string;
  error?: string;
  retryAfterSeconds?: number;
};

export function LocalityNewsletterBox({
  slug,
  municipalityName
}: LocalityNewsletterBoxProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contentApiBase || !email.trim()) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setSuccessMessage("");

    void (async () => {
      try {
        const response = await fetch(
          `${contentApiBase}/api/localities/${slug}/newsletter`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email: email.trim(),
              displayName: displayName.trim()
            })
          }
        );

        const payload = (await response.json()) as SubscribeResponse;

        if (!response.ok) {
          if (payload.error === "newsletter_unavailable") {
            throw new Error("The weekly digest is not configured yet. Try again after the next deploy.");
          }

          if (payload.error === "rate_limited") {
            const minutes = payload.retryAfterSeconds
              ? Math.max(1, Math.ceil(payload.retryAfterSeconds / 60))
              : null;
            throw new Error(
              minutes
                ? `Too many signup attempts from this network. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
                : "Too many signup attempts right now. Try again a bit later."
            );
          }

          throw new Error("Failed to subscribe");
        }

        setSuccessMessage(
          payload.status === "confirmation_resent"
            ? "Check your inbox for a fresh confirmation email and newsletter settings link."
            : "Check your inbox to confirm your subscription."
        );
        setStatus("success");
        setEmail("");
        setDisplayName("");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The newsletter signup did not go through. Try again in a moment."
        );
        setStatus("error");
      }
    })();
  }

  return (
    <section
      id="newsletter"
      className="rounded-[2rem] border border-white/75 bg-white p-6 shadow-card"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
        Weekly digest
      </p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-moss">
        Get {municipalityName} in one weekly email
      </h2>
      <p className="mt-3 text-sm leading-7 text-ink/72">
        Subscribe for a source-linked weekly roundup of the most notable local
        meetings, alerts, planning items, and township news.
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-[1.25rem] border border-ink/10 bg-sand/35 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss/30 focus:bg-white"
        />
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="First name (optional)"
          className="w-full rounded-[1.25rem] border border-ink/10 bg-sand/35 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss/30 focus:bg-white"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Saving..." : "Subscribe"}
        </button>
      </form>

      {status === "success" ? (
        <div className="mt-4 rounded-[1.5rem] border border-moss/10 bg-sand/35 px-4 py-4 text-sm leading-7 text-ink/78">
          {successMessage}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-4 rounded-[1.5rem] border border-clay/20 bg-[#fbf8f2] px-4 py-4 text-sm leading-7 text-ink/75">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
