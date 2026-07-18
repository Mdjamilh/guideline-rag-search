import type { Metadata } from "next";
import { Suspense } from "react";

import { AskExperience } from "@/components/ask-experience";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Ask" };

export default function AskPage() {
  return (
    <>
      <PageHeader
        title="Ask the guidelines"
        description="Answers are grounded in the guideline library and every claim links to its source passage."
      />
      {/* useSearchParams needs a Suspense boundary for static rendering. */}
      <Suspense>
        <AskExperience />
      </Suspense>
    </>
  );
}
