import { Suspense } from "react";

import { LocalityEntryClient } from "../../../components/locality-entry-client";

type LocalityItemPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [{ slug: "manheimtownshippa" }];
}

export default async function LocalityItemPage({
  params
}: LocalityItemPageProps) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
          <div className="rounded-2xl border border-white/[0.12] bg-white/[0.08] p-8 text-white/[0.70]">
            Loading digest item...
          </div>
        </div>
      }
    >
      <LocalityEntryClient slug={slug} />
    </Suspense>
  );
}
