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
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-[2rem] border border-white/75 bg-white p-8 shadow-card">
            Loading digest item...
          </div>
        </div>
      }
    >
      <LocalityEntryClient slug={slug} />
    </Suspense>
  );
}
