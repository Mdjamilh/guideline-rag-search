import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState
        icon={CompassIcon}
        title="Page not found"
        description="That guideline or page doesn't exist. Browse the library or ask a question instead."
        action={
          <Button asChild>
            <Link href="/guidelines">Browse guidelines</Link>
          </Button>
        }
      />
    </div>
  );
}
