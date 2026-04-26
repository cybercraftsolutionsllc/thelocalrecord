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
          <div className="rounded-lg border border-ink/10 bg-white p-8">
            Loading digest item...
          </div>
        </div>
      }
    >
      <LocalityEntryClient slug={slug} />
    </Suspense>
  );
}
