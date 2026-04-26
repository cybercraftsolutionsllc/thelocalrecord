import { Suspense } from "react";

import { NewsletterConfirmClient } from "../../../components/newsletter-confirm-client";

export default function NewsletterConfirmPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Suspense
        fallback={
          <div className="rounded-lg border border-ink/10 bg-white p-8">
            Loading confirmation...
          </div>
        }
      >
        <NewsletterConfirmClient />
      </Suspense>
    </div>
  );
}
