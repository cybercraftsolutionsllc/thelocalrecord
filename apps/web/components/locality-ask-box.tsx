"use client";

import { useState } from "react";

import { contentApiBase } from "../lib/public-config";

type LocalityAskBoxProps = {
  slug: string;
  localityName: string;
};

type AskResponse =
  | {
      mode: "clarify";
      clarifyQuestion: string;
      disclaimer: string;
    }
  | {
      mode: "answer";
      answer: string;
      disclaimer: string;
      citations: Array<{
        title: string;
        url: string;
        label: string;
        sourceName: string;
      }>;
    };

export function LocalityAskBox({ slug, localityName }: LocalityAskBoxProps) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<AskResponse | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();

    if (!trimmed || !contentApiBase) {
      return;
    }

    setStatus("loading");

    void (async () => {
      try {
        const response = await fetch(`${contentApiBase}/api/localities/${slug}/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ question: trimmed })
        });

        if (!response.ok) {
          throw new Error("Failed to ask locality question");
        }

        setResult((await response.json()) as AskResponse);
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    })();
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-card">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Ask this locality</p>
        <h2 className="font-serif text-3xl text-moss">Ask a question about {localityName}</h2>
        <p className="max-w-3xl text-sm leading-7 text-ink/70">
          Ask about a notice, meeting, ordinance, alert, or planning item. Answers are grounded in the
          current published entries and return source links.
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sr-only">Question about this locality</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            placeholder="Ask something like: What changed with the codified code notice? or What meetings are coming up this month?"
            className="w-full rounded-[1.5rem] border border-ink/10 bg-sand/40 px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-moss/30 focus:bg-white"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={status === "loading" || question.trim().length === 0}
            className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Thinking..." : "Ask"}
          </button>
          <p className="text-xs leading-6 text-ink/55">
            AI-assisted answers are informational only and should be checked against the cited source.
          </p>
        </div>
      </form>

      {status === "error" ? (
        <div className="mt-5 rounded-[1.5rem] border border-clay/20 bg-clay/5 px-4 py-4 text-sm leading-7 text-ink/75">
          The locality answer service did not respond. Try again in a moment.
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-[1.75rem] border border-ink/10 bg-sand/30 p-5">
          {result.mode === "clarify" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Clarifying question</p>
              <p className="text-base leading-7 text-ink/80">{result.clarifyQuestion}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">Answer</p>
                <p className="mt-3 text-base leading-8 text-ink/85">{result.answer}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-ink">Sources</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {result.citations.map((citation) => (
                    <a
                      key={`${citation.url}-${citation.title}`}
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-moss/15 px-3 py-2 text-sm text-moss transition hover:bg-sky"
                      title={`${citation.sourceName}: ${citation.title}`}
                    >
                      {citation.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-6 text-ink/55">{result.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
