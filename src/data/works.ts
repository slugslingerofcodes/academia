export interface Work {
  slug: string;
  /** display date, e.g. 2025.11.02 */
  date: string;
  /** Japanese subtitle shown above the title */
  jpSubtitle: string;
  title: string;
  description: string;
  tags: string[];
  cover: string;
}

export const WORKS: Work[] = [
  {
    slug: "midnight-transit",
    date: "2025.11.02",
    jpSubtitle: "終電のシンフォニー",
    title: "MIDNIGHT TRANSIT — REALTIME CITY SYMPHONY",
    description:
      "An audio-reactive WebGL ride through the last train of the night, scored by live station noise.",
    tags: ["#WebGL", "#GLSL", "#TouchDesigner"],
    cover: "/covers/midnight-transit.svg",
  },
  {
    slug: "midnight-tag",
    date: "2025.07.24",
    jpSubtitle: "鬼ごっこ",
    title: "MIDNIGHT TAG BUILT IN FORTNITE",
    description:
      "An asymmetric chase island for 16 players — one oni, fifteen runners, zero streetlights.",
    tags: ["#Fortnite", "#UEFN", "#Verse"],
    cover: "/covers/midnight-tag.svg",
  },
  {
    slug: "paper-satellites",
    date: "2024.12.13",
    jpSubtitle: "紙の衛星",
    title: "PAPER SATELLITES",
    description:
      "A generative print series plotting 10,000 imaginary orbits, drawn nightly by a pen plotter.",
    tags: ["#Generative", "#p5js", "#PenPlotter"],
    cover: "/covers/paper-satellites.svg",
  },
  {
    slug: "ghost-signal",
    date: "2024.09.01",
    jpSubtitle: "幽霊信号",
    title: "GHOST SIGNAL 76.4MHz",
    description:
      "A haunted FM installation that tunes itself — antennas, tape loops and voices that were never broadcast.",
    tags: ["#MaxMSP", "#Arduino", "#SoundArt"],
    cover: "/covers/ghost-signal.svg",
  },
  {
    slug: "contour-room",
    date: "2024.05.17",
    jpSubtitle: "等高線の部屋",
    title: "CONTOUR ROOM",
    description:
      "A projection-mapped chamber where the floor plan is redrawn every minute from live weather data.",
    tags: ["#Projection", "#TouchDesigner", "#Installation"],
    cover: "/covers/contour-room.svg",
  },
  {
    slug: "neon-shrine",
    date: "2023.10.31",
    jpSubtitle: "夜の神社",
    title: "NEON SHRINE",
    description:
      "An AR pilgrimage — scan a paper charm and a shrine assembles itself out of city light.",
    tags: ["#Unity", "#AR", "#Shader"],
    cover: "/covers/neon-shrine.svg",
  },
];

/** shortest signed distance from `active` to `i` on a ring of size `n` (-n/2..n/2] */
export function ringOffset(i: number, active: number, n: number): number {
  let d = (i - active) % n;
  if (d < -n / 2) d += n;
  if (d > n / 2) d -= n;
  return d;
}
