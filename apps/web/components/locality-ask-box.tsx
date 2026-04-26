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
    label: "Property",
    question: "What local records should I check for my property or street?"
  },
  {
    label: "Ashford Meadows",
    question: "What changed with Ashford Meadows?"
  },
  {
    label: "Route 30",
    question: "What should residents know about Route 30?"
  },
  {
    label: "Next meeting",
    question: "What meeting or agenda records should I review next?"
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
      className="scroll-mt-24 rounded-lg border border-ink/10 bg-white p-5"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold text-moss">Ask</p>
        <p className="text-sm leading-6 text-ink/62">
          Source-linked answers for specific local questions.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {askExamples.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => askQuestion(example.question)}
              disabled={status === "loading"}
              className="rounded-md border border-ink/10 px-2.5 py-1.5 text-xs font-semibold text-ink/68 transition hover:border-moss/25 hover:text-moss disabled:cursor-not-allowed disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sr-only">Question about this locality</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            placeholder="What changed with Ashford Meadows?"
            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-3 text-sm leading-6 text-ink outline-none transition focus:border-moss"
          />
        </label>

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={status === "loading" || question.trim().length === 0}
            className="rounded-lg bg-moss px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Thinking..." : "Ask"}
          </button>
        </div>
      </form>

      {status === "error" ? (
        <div className="mt-4 rounded-lg border border-clay/20 bg-white px-3 py-3 text-sm leading-6 text-clay">
          The locality answer service did not respond. Try again in a moment.
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-lg border border-ink/10 bg-sand p-4">
          {result.mode === "clarify" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-moss">
                Clarifying question
              </p>
              <p className="text-sm leading-6 text-ink/72">
                {result.clarifyQuestion}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-moss">Answer</p>
                <p className="mt-2 text-sm leading-7 text-ink/78">
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
                      className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-moss transition hover:bg-sky"
                      title={`${citation.sourceName}: ${citation.title}`}
                    >
                      {citation.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-ink/50">
            {result.disclaimer}
          </p>
        </div>
      ) : null}
    </section>
  );
}
