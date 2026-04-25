"use client";

import { useState } from "react";

import { contentApiBase } from "../lib/public-config";

type LocalityAskBoxProps = {
  slug: string;
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

const askExamples = [
  {
    label: "Ashford Meadows",
    question: "What changed with Ashford Meadows?"
  },
  {
    label: "Planning Commission",
    question: "What Planning Commission records should I review next?"
  },
  {
    label: "Route 30",
    question: "What should residents know about Route 30?"
  },
  {
    label: "Codified code",
    question: "Where can I find the codified code records?"
  }
];

export function LocalityAskBox({ slug }: LocalityAskBoxProps) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<AskResponse | null>(null);

  function askQuestion(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    setQuestion(trimmed);

    if (!trimmed || !contentApiBase) {
      return;
    }

    setStatus("loading");
    setResult(null);

    void (async () => {
      try {
        const response = await fetch(
          `${contentApiBase}/api/localities/${slug}/ask`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ question: trimmed })
          }
        );

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askQuestion(question);
  }

  return (
    <section
      id="ask"
      className="relative scroll-mt-24 overflow-hidden rounded-[1.5rem] border border-white/75 bg-white p-6 shadow-card"
    >
      <div className="relative space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
          Ask this locality
        </p>
        <p className="text-sm leading-7 text-ink/70">
          Ask about a project, meeting, notice, ordinance, or planning item and
          get a source-linked answer.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {askExamples.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => askQuestion(example.question)}
              disabled={status === "loading"}
              className="rounded-full border border-moss/10 bg-sand/35 px-3 py-2 text-xs font-semibold text-moss transition hover:bg-sky disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ask: {example.label}
            </button>
          ))}
        </div>
      </div>

      <form className="relative mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sr-only">Question about this locality</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            placeholder="What changed with Ashford Meadows?"
            className="w-full rounded-[1.5rem] border border-ink/10 bg-sand/35 px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-moss/30 focus:bg-white"
          />
        </label>

        <div className="flex flex-col items-start gap-3">
          <button
            type="submit"
            disabled={status === "loading" || question.trim().length === 0}
            className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Thinking..." : "Ask"}
          </button>
          <p className="text-xs leading-6 text-ink/55">
            Source-grounded and AI-assisted. Best for specific questions.
          </p>
        </div>
      </form>

      {status === "error" ? (
        <div className="mt-5 rounded-[1.5rem] border border-clay/20 bg-[#fbf8f2] px-4 py-4 text-sm leading-7 text-ink/75">
          The locality answer service did not respond. Try again in a moment.
        </div>
      ) : null}

      {result ? (
        <div className="relative mt-5 rounded-[1.75rem] border border-ink/10 bg-sand/50 p-5">
          {result.mode === "clarify" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                Clarifying question
              </p>
              <p className="text-base leading-7 text-ink/80">
                {result.clarifyQuestion}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
                  Answer
                </p>
                <p className="mt-3 text-base leading-8 text-ink/85">
                  {result.answer}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-ink">Sources</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.citations.map((citation) => (
                    <a
                      key={`${citation.url}-${citation.title}`}
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-moss/15 bg-white px-3 py-2 text-sm text-moss transition hover:bg-sky"
                      title={`${citation.sourceName}: ${citation.title}`}
                    >
                      {citation.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-6 text-ink/55">
            {result.disclaimer}
          </p>
        </div>
      ) : null}
    </section>
  );
}
