import { notFound } from "next/navigation";
import Link from "next/link";

import { LocalityAskBox } from "../../components/locality-ask-box";
import { LocalityNewsletterBox } from "../../components/locality-newsletter-box";
import { LocalitySubnav } from "../../components/locality-subnav";
import { LivePublishedEntries } from "../../components/live-published-entries";
import { getLocalityData } from "../../lib/data";

type LocalityPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [{ slug: "manheimtownshippa" }];
}

export default async function LocalityPage({ params }: LocalityPageProps) {
  const { slug } = await params;
  const data = await getLocalityData(slug);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:gap-12">
      <section className="overflow-hidden rounded-[2.5rem] bg-moss text-white shadow-card">
        <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-10 lg:py-11">
          <div className="flex h-full flex-col">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky">
              Locality digest
            </span>
            <div className="mt-5 space-y-4">
              <h1 className="text-balance max-w-4xl font-serif text-4xl leading-[1.04] text-sand sm:text-5xl lg:text-[3.8rem]">
                {data.municipality.shortName}
              </h1>
              <p className="text-pretty max-w-3xl text-lg leading-8 text-white/82">
                Clear local updates, the most useful source links, and enough
                context to understand what changed without digging through five
                township pages first.
              </p>
            </div>
            <div className="mt-8 max-w-3xl rounded-[1.5rem] border border-white/15 bg-white/10 px-5 py-4 text-sm leading-7 text-white/82">
              This digest is independent and resident-run. It links back to
              township sources, but it is not affiliated with or speaking for
              Manheim Township.
            </div>
          </div>

          <div className="flex h-full flex-col justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky">
                Use this page
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                <li>
                  Start with the latest items residents are most likely to care
                  about.
                </li>
                <li>
                  Use search when you want a project, address, ordinance, or
                  meeting name.
                </li>
                <li>Open the original source when you want the full record.</li>
              </ul>
            </div>
            <div className="pt-1">
              <LocalitySubnav slug={slug} currentSuffix="" tone="dark" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.34fr_0.66fr] lg:items-start">
        <div className="min-w-0">
          <LivePublishedEntries slug={slug} initialEntries={data.entries} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <LocalityNewsletterBox
            slug={slug}
            municipalityName={data.municipality.shortName}
          />

          <section className="rounded-[2rem] border border-white/75 bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              Helpful links
            </p>
            <p className="mt-3 text-sm leading-7 text-ink/70">
              Use the digest first, then jump into the source trail, reporting,
              or policy when you need more context.
            </p>
            <div className="mt-5 grid gap-3">
              <Link
                href={`/${slug}/source-inventory`}
                className="rounded-[1.25rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Source inventory
              </Link>
              <Link
                href={`/${slug}/corrections`}
                className="rounded-[1.25rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Corrections and reporting
              </Link>
              <Link
                href="/policy"
                className="rounded-[1.25rem] border border-moss/10 bg-sand/40 px-4 py-4 text-sm font-semibold text-moss transition hover:bg-sky/40"
              >
                Platform policy
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/75 bg-white p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              What to expect
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
              <li>
                Events of note are meant to be quick to scan, not a
                substitute for the source.
              </li>
              <li>
                Use search for projects, addresses, ordinances, or development
                names that may span multiple records.
              </li>
              <li>
                If a question matters legally or financially, open the cited
                source before acting.
              </li>
            </ul>
          </section>

          <LocalityAskBox slug={slug} />
        </aside>
      </section>
    </div>
  );
}
