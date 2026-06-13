import { BookOpenCheckIcon } from "lucide-react";
import Link from "next/link";

import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/ask", label: "Ask" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/about", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <BookOpenCheckIcon className="size-4" />
          </span>
          <span className="hidden sm:inline">GuideSearch</span>
        </Link>
        <NavLinks items={NAV} />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
