import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { listDocuments } from "@/server/library";

export const metadata: Metadata = { title: "Guidelines" };
export const dynamic = "force-dynamic";

export default async function GuidelinesPage() {
  const docs = await listDocuments();
  const byTopic = Map.groupBy(docs, (d) => d.topic);

  return (
    <>
      <PageHeader
        title="Guideline library"
        description={`${docs.length} plain-language summaries of U.S. preventive-care recommendations, each linked to its official source.`}
      />
      <div className="space-y-10">
        {[...byTopic].map(([topic, items]) => (
          <section key={topic} aria-labelledby={`topic-${topic}`}>
            <h2
              id={`topic-${topic}`}
              className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase"
            >
              {topic}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/guidelines/${doc.slug}`}
                    className="group bg-card hover:border-primary/50 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-[3px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {doc.organization} · {doc.year}
                      </p>
                    </div>
                    <ChevronRightIcon className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
