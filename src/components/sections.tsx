import { Badge } from "@/components/ui/badge";
import { WORKS } from "@/data/works";

const NEWS_ITEMS = [
  {
    date: "2026.07.01",
    tag: "RELEASE",
    title: "CONTOUR ROOM permanent installation opens in Kyoto",
    jp: "常設展示",
  },
  {
    date: "2026.05.19",
    tag: "AWARD",
    title: "MIDNIGHT TRANSIT — jury selection, Night Signal Festival",
    jp: "審査員推薦",
  },
  {
    date: "2026.02.03",
    tag: "TALK",
    title: "“Realtime kitsch” — a lecture on cursed shaders",
    jp: "講演",
  },
  {
    date: "2025.12.24",
    tag: "SHOP",
    title: "PAPER SATELLITES zine, second printing now available",
    jp: "再版",
  },
];

function SectionHeading({ en, jp }: { en: string; jp: string }) {
  return (
    <div className="mb-10 flex items-baseline gap-4">
      <h2 className="font-display text-4xl tracking-[0.06em] text-foreground md:text-5xl">
        {en}
      </h2>
      <span className="font-jp text-xs tracking-[0.25em] text-muted">{jp}</span>
      <span className="ml-auto hidden text-[9px] tracking-[0.3em] text-muted md:block">
        ▲ MANIAC
      </span>
    </div>
  );
}

export function NewsSection() {
  return (
    <section id="news" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-24">
      <SectionHeading en="NEWS" jp="ニュース / UPDATES" />
      <div>
        {NEWS_ITEMS.map((item) => (
          <div
            key={item.date}
            className="group grid grid-cols-[92px_1fr] items-baseline gap-x-4 gap-y-1 border-t border-border py-5 last:border-b md:grid-cols-[100px_88px_1fr_80px]"
          >
            <span className="text-[11px] tracking-[0.2em] text-muted">
              {item.date}
            </span>
            <Badge
              variant="outline"
              className="hidden justify-self-start rounded-full border-border bg-transparent text-[9px] tracking-[0.15em] text-foreground/60 md:inline-flex"
            >
              {item.tag}
            </Badge>
            <span className="col-span-2 text-sm text-foreground/85 transition-colors group-hover:text-accent md:col-span-1">
              {item.title}
            </span>
            <span className="hidden justify-self-end font-jp text-[10px] text-muted md:block">
              {item.jp}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-24">
      <SectionHeading en="ABOUT" jp="私たちについて" />
      <div className="grid gap-12 md:grid-cols-2">
        <p className="font-display text-2xl uppercase leading-snug tracking-[0.04em] text-foreground md:text-3xl">
          We build night-mode worlds — realtime graphics, sound machines &amp;
          playable cities.
        </p>
        <div className="flex flex-col gap-6 text-[13px] leading-relaxed text-muted">
          <p>
            MANIAC is a two-person digital workshop operating between Goa and
            Tokyo, open strictly after dark. We prototype fast, ship weird, and
            treat every browser tab like a gallery wall.
          </p>
          <p className="font-jp">
            マニアック制作所は夜だけ稼働するデジタル工房です。リアルタイム映像、
            音の機械、遊べる都市をつくっています。
          </p>
          <dl className="grid grid-cols-[92px_1fr] gap-y-2 border-t border-border pt-5 text-[11px] tracking-[0.15em]">
            <dt className="text-foreground/50">FIELDS</dt>
            <dd>WebGL / UEFN / Sound / Print / AR</dd>
            <dt className="text-foreground/50">FOUNDED</dt>
            <dd>2023 — 深夜</dd>
            <dt className="text-foreground/50">STATUS</dt>
            <dd className="text-accent">RECRUITING ONE NIGHT OWL</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}

const TICKER =
  "MANIAC DIGITAL WORKS ▲ 夜間営業 ▲ REALTIME GRAPHICS ▲ SOUND MACHINES ▲ PLAYABLE CITIES ▲ ";

export function SiteFooter() {
  return (
    <footer id="archive" className="scroll-mt-14 border-t border-border">
      {/* ticker */}
      <div className="overflow-hidden border-b border-border py-3">
        <div className="marquee-track flex w-max whitespace-nowrap">
          {[0, 1].map((k) => (
            <span
              key={k}
              className="pr-2 text-[11px] tracking-[0.35em] text-muted"
              aria-hidden={k === 1}
            >
              {TICKER.repeat(3)}
            </span>
          ))}
        </div>
      </div>

      {/* archive list */}
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <SectionHeading en="ARCHIVE" jp="全作品の記録" />
        <div>
          {WORKS.map((w, i) => (
            <a
              key={w.slug}
              href="#works"
              className="group grid grid-cols-[92px_1fr] items-baseline gap-x-4 border-t border-border py-4 last:border-b md:grid-cols-[100px_1fr_auto]"
              data-cursor="hover"
            >
              <span className="text-[11px] tracking-[0.2em] text-muted">
                {w.date}
              </span>
              <span className="truncate text-sm uppercase tracking-[0.06em] text-foreground/85 transition-colors group-hover:text-accent">
                <span className="mr-3 text-[10px] text-foreground/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {w.title}
              </span>
              <span className="hidden text-[10px] tracking-[0.1em] text-muted md:block">
                {w.tags.join(" ")}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-6 text-[10px] tracking-[0.2em] text-muted md:flex-row md:items-center md:justify-between">
          <span>© 2026 MANIAC DIGITAL WORKS ▲</span>
          <span className="font-jp">ゴア — 東京 / 夜間のみ</span>
          <span className="text-foreground/60">
            CONTACT / RECRUIT — hello@maniac.studio
          </span>
        </div>
      </div>
    </footer>
  );
}
