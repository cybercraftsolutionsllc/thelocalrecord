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
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
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
            throw new Error(
              "The weekly digest is not configured yet. Try again after the next deploy."
            );
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
      className="rounded-2xl border border-white/[0.12] bg-[#0b171d]/95 p-5 text-white shadow-card sm:p-6"
    >
      <p className="text-sm font-semibold text-sky">Weekly digest</p>
      <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-white">
        Keep an eye on {municipalityName}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/[0.62]">
        A weekly source-linked roundup for people who do not want to check the
        record every day.
      </p>

      <form className="mt-4 space-y-2" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-white/[0.12] bg-white/[0.045] px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/[0.34] focus:border-moss"
        />
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="First name (optional)"
          className="w-full rounded-lg border border-white/[0.12] bg-white/[0.045] px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/[0.34] focus:border-moss"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="w-full rounded-lg bg-moss px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Saving..." : "Subscribe"}
        </button>
      </form>

      {status === "success" ? (
        <div className="mt-3 rounded-lg border border-moss/[0.30] bg-moss/[0.14] px-3 py-3 text-sm leading-6 text-white/[0.72]">
          {successMessage}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-3 rounded-lg border border-clay/[0.30] bg-clay/[0.10] px-3 py-3 text-sm leading-6 text-white/[0.78]">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
