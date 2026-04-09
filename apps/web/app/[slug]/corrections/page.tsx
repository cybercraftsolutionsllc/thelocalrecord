import Link from "next/link";
import { notFound } from "next/navigation";

import { LocalitySubnav } from "../../../components/locality-subnav";
import { getLocalityData } from "../../../lib/data";

type LocalityCorrectionsPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [{ slug: "manheimtownshippa" }];
}

export default async function LocalityCorrectionsPage({
  params
}: LocalityCorrectionsPageProps) {
  const { slug } = await params;
  const data = await getLocalityData(slug);

  if (!data) {
    notFound();
  }

  const correctionsEmail =
    process.env.CORRECTIONS_EMAIL ?? "cyber.craft@craftedcybersolutions.com";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-card">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            {data.municipality.shortName} corrections
          </p>
          <div className="space-y-3">
            <h1 className="font-serif text-4xl text-moss">
              Report an issue on this digest
            </h1>
            <p className="max-w-3xl text-base leading-8 text-ink/75">
              If a digest entry is missing context, links to the wrong source,
              or states something inaccurately, send the entry URL and the
              official source material so it can be checked.
            </p>
          </div>
          <LocalitySubnav slug={slug} currentSuffix="/corrections" />
        </div>

        <div className="mt-6 space-y-4 text-base leading-8 text-ink/75">
          <p>
            Send reports to
            <a
              className="ml-1 font-semibold text-moss"
              href={`mailto:${correctionsEmail}`}
            >
              {correctionsEmail}
            </a>
            .
          </p>
          <p>
            Include the digest page URL, the source material URL, and the
            specific issue you want reviewed.
          </p>
          <p>
            This locality digest is independent and resident-run. For official
            notices, deadlines, or legal reliance, always use the underlying
            township source.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/${slug}`}
            className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss/90"
          >
            Return to digest
          </Link>
          <Link
            href="/corrections"
            className="rounded-full border border-moss/15 px-5 py-3 text-sm font-semibold text-moss transition hover:bg-sky/40"
          >
            Platform-wide corrections policy
          </Link>
        </div>
      </div>
    </div>
  );
}
