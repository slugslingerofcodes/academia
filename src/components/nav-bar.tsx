"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#news", en: "NEWS", jp: "ニュース" },
  { href: "#works", en: "WORKS", jp: "作品" },
  { href: "#about", en: "ABOUT", jp: "私たち" },
  { href: "#archive", en: "ARCHIVE", jp: "記録" },
  { href: "/planner", en: "LEDGER", jp: "台帳" },
];

function TriangleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 4 21.5 20.5h-19Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-background/70 backdrop-blur-md">
        <div className="relative mx-auto flex h-full max-w-[1720px] items-center justify-between px-4 md:px-6">
          {/* wordmark */}
          <a href="#top" className="flex items-center gap-2.5" data-cursor="hover">
            <TriangleGlyph className="size-4 text-accent" />
            <span className="font-display text-lg leading-none tracking-[0.3em] text-foreground">
              MANIAC
            </span>
            <span className="mt-0.5 hidden font-jp text-[9px] tracking-[0.25em] text-muted sm:block">
              マニアック制作所
            </span>
          </a>

          {/* center nav */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.en}
                href={l.href}
                className="group flex flex-col items-center leading-none"
                data-cursor="hover"
              >
                <span className="text-[11px] tracking-[0.3em] text-foreground/80 transition-colors group-hover:text-accent">
                  {l.en}
                </span>
                <span className="mt-1.5 font-jp text-[9px] tracking-[0.2em] text-muted">
                  {l.jp}
                </span>
              </a>
            ))}
          </nav>

          {/* right cluster */}
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[9px] tracking-[0.15em] text-muted lg:flex">
              <span className="blink-dot size-1.5 rounded-full bg-accent" />
              NEW BUILD v2.4 AVAILABLE
            </span>
            <Button
              variant="outline"
              size="sm"
              className="hidden rounded-full border-foreground/20 bg-transparent px-4 text-[10px] tracking-[0.25em] hover:border-accent hover:bg-transparent hover:text-accent md:inline-flex"
              data-cursor="hover"
              onClick={() => {
                document.querySelector("#archive")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              CONTACT / RECRUIT
            </Button>

            {/* mobile hamburger */}
            <button
              type="button"
              aria-label="Menu"
              className="flex size-9 flex-col items-center justify-center gap-1.5 md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="h-px w-5 bg-foreground" />
              <span className="h-px w-5 bg-foreground" />
              <span className="h-px w-3.5 self-end bg-accent" />
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-lg md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2.5">
                <TriangleGlyph className="size-4 text-accent" />
                <span className="font-display text-lg tracking-[0.3em]">MANIAC</span>
              </span>
              <button
                type="button"
                aria-label="Close menu"
                className="text-[11px] tracking-[0.3em] text-muted"
                onClick={() => setOpen(false)}
              >
                CLOSE ✕
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-8 px-8">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.en}
                  href={l.href}
                  className="flex items-baseline gap-4"
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                >
                  <span className="font-display text-4xl tracking-[0.12em] text-foreground">
                    {l.en}
                  </span>
                  <span className="font-jp text-xs text-muted">{l.jp}</span>
                </motion.a>
              ))}
            </nav>
            <div className="border-t border-border p-6">
              <span className="text-[10px] tracking-[0.3em] text-muted">
                CONTACT / RECRUIT — hello@maniac.studio
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
