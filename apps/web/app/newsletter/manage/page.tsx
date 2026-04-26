import { Suspense } from "react";

import { NewsletterManageClient } from "../../../components/newsletter-manage-client";

export default function NewsletterManagePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Suspense
        fallback={
          <div className="rounded-lg border border-ink/10 bg-white p-8">
            Loading newsletter settings...
          </div>
        }
      >
        <NewsletterManageClient />
      </Suspense>
    </div>
  );
}
