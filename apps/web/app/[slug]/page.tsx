import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

import { LocalityAskBox } from "../../components/locality-ask-box";
import { LocalityMeetingIntelligence } from "../../components/locality-meeting-intelligence";
import { LocalityNewsletterBox } from "../../components/locality-newsletter-box";
import { LivePublishedEntries } from "../../components/live-published-entries";
import { getLocalityData } from "../../lib/data";
import { municipalities } from "@thelocalrecord/core";

type LocalityPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return municipalities.map((municipality) => ({ slug: municipality.slug }));
}

export default async function LocalityPage({ params }: LocalityPageProps) {
  const { slug } = await params;
  const data = await getLocalityData(slug);

  if (!data) {
    notFound();
  }

  const activeSources = data.municipality.sources.filter(
    (source) => source.implemented
  );
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-4 sm:px-6 lg:py-8">
      <section className="min-w-0">
        <LivePublishedEntries
          slug={slug}
          municipalityName={data.municipality.name}
          initialEntries={data.entries}
          trackedSources={activeSources.map((source) => ({
            name: source.name,
            publicCategory: source.publicCategory,
            url: source.url
          }))}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <ToolDetails title="Meeting details" summary="Decisions and project movement">
          <LocalityMeetingIntelligence slug={slug} />
        </ToolDetails>

        <ToolDetails title="Ask" summary="Plain answer with citations">
          <LocalityAskBox slug={slug} />
        </ToolDetails>

        <ToolDetails title="Weekly digest" summary="Source-linked email updates">
          <LocalityNewsletterBox
            slug={slug}
            municipalityName={data.municipality.shortName}
          />
        </ToolDetails>
      </section>

      <section className="rounded-2xl border border-white/12 bg-white/8 p-4">
        <p className="text-sm font-semibold text-white">Trust trail</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={`/${slug}/source-inventory`}
            className="rounded-lg border border-white/12 px-3 py-2 font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Sources
          </Link>
          <Link
            href={`/${slug}/corrections`}
            className="rounded-lg border border-white/12 px-3 py-2 font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Fix a detail
          </Link>
          <Link
            href="/policy"
            className="rounded-lg border border-white/12 px-3 py-2 font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Rules
          </Link>
        </div>
      </section>
    </div>
  );
}

function ToolDetails({
  title,
  summary,
  children
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-2xl border border-white/12 bg-white/8 p-4 transition hover:border-moss/45">
        <p className="text-2xl font-semibold leading-tight tracking-tight text-white">
          {title}
        </p>
        <p className="mt-1 text-sm leading-6 text-white/58">{summary}</p>
        <p className="mt-3 text-sm font-semibold text-sky group-open:hidden">
          Open
        </p>
        <p className="mt-3 hidden text-sm font-semibold text-sky group-open:block">
          Close
        </p>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
