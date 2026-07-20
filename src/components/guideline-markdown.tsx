import { LinkIcon } from "lucide-react";
import Markdown from "react-markdown";

import { slugify } from "@/lib/chunk";

/**
 * Renders a guideline body. Section headings get the same anchors as the
 * retrieval chunks, so "Read in context" links land on the cited section.
 */
export function GuidelineMarkdown({ body }: { body: string }) {
  return (
    <Markdown
      components={{
        h2: ({ children }) => {
          const id = slugify(String(children));
          return (
            <h2
              id={id}
              className="group target:bg-primary/10 mt-10 mb-3 scroll-mt-24 rounded-md text-xl font-semibold tracking-tight target:px-2"
            >
              <a href={`#${id}`} className="inline-flex items-center gap-2">
                {children}
                <LinkIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-60" />
              </a>
            </h2>
          );
        },
        p: ({ children }) => <p className="text-muted-foreground mb-4 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="text-muted-foreground mb-4 list-disc space-y-2 pl-6">{children}</ul>,
        strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
      }}
    >
      {body}
    </Markdown>
  );
}
