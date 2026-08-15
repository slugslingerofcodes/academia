# Academia — Tasks, Timetable & Holidays

A student planner built with [Next.js](https://nextjs.org). Everything is stored
locally in the browser (localStorage) — no account or backend needed.

## Features

- **Changes from your email** — scans recent mail for cancellations,
  reschedules and room changes naming classes you've added, and proposes the
  matching one-off change. **Nothing is applied without your approval**: an
  email is written by whoever sent it, so it must not be able to rewrite your
  timetable unattended. Each suggestion quotes the sentence it came from. Uses
  read-only Gmail access, requested only when you scan.
- **Class-aware scheduling** — generated work sessions steer around your
  timetable: within each evenly-spaced slot they pick your lightest teaching
  day, and take the largest class-free window on it.
- **Tasks & Projects** — start a task or project over any period and Academia
  generates a timetable: work sessions spread evenly across the dates, skipping
  weekends if you want. Check sessions off to track progress.
- **Upcoming** — one table per week for the next 2, 4 or 8 weeks, merging all
  three schedules: classes down one column, tasks and projects down the other,
  with holidays and deadlines marked. Today is highlighted, past days dimmed,
  and each week carries a one-line count. A holiday replaces that day's classes
  with the holiday name, since it cancels all of them at once; a single class
  cancelled or moved by an exception stays visible with a marker and its new
  time, because that's specific information worth seeing. Weeks with nothing in
  them are hidden by default.
- **Instructor and section** — both optional, on top of the code, name, kind,
  times and room. Add them when a class is created or later by editing it, and
  they show in the list and Upcoming views, in the chart's tooltip, and in the
  description of the exported calendar event. Classes added before these
  existed simply don't have them; nothing needs migrating.
- **Weekly Timetable** — add a subject once with its code, name and kind
  (lecture / lab / tutorial), ticking every day it meets and giving each day its
  own times and room. View it as a **chart** (time down the side, days across
  the top, overlapping classes shown side by side) or as a per-day **list**.
  Sessions are coloured by kind, with today highlighted.
- **Import a calendar file** — drop in an `.ics` from your university portal,
  Google Calendar, or Academia itself, and its weekly classes are added. Handles
  folded lines, `BYDAY` repeats across several days, UTC and floating times, and
  `DURATION` in place of `DTEND`; all-day and non-weekly entries are skipped, and
  classes already in your timetable aren't duplicated.
- **Class reminders** — browser notifications fire 10 minutes before each class.
  Keep the app open in a tab; reminders are deduped per class per day.
- **Start-of-day summary** — one notification each morning listing what's due:
  deadlines first, then work sessions and how many classes. The time is
  configurable, it fires at most once a day, and it catches up if the app wasn't
  open at that hour. On a holiday it still reports deadlines and work sessions —
  those don't move for a day off — while classes stay muted.
- **Type it instead** — write one line and Academia works out what you meant:
  `MATH F111 Mathematics I lecture Mon 9-10 in LT1` adds a weekly class,
  `CS F111 lab Tue and Thu 2-4pm in D201` adds one on both days,
  `holiday on 26 June for Muharram` marks a holiday, and
  `cancel CS F111 on 18 Aug` records a one-off cancellation. The reading is
  shown field by field as you type and nothing is added until you confirm,
  because free text is ambiguous where a form isn't. When a line can't be read
  it says which part is missing rather than guessing — no day, no time, no
  name, or a date the class doesn't actually meet on. It's all plain rules, no
  model and no network, so it works offline. Tick **Write to Google Calendar as
  well** and it pushes as soon as you add — off until you ask for it, then
  remembered. What gets pushed isn't always the obvious thing: a holiday and a
  one-off change have no event of their own, so they rewrite the classes they
  apply to, which is how the date drops out of the series.
- **One-off changes** — a class repeats weekly, so "this Thursday's lecture is
  cancelled" can't be recorded by editing the class without wiping every other
  week. Record it as a one-off instead: cancelled, rescheduled, or a room
  change, for a single date. The week view, reminders, the Upcoming table and
  the calendar export all follow it. Anything approved from an email lands in
  the same list and can be undone there, and a date the class doesn't actually
  meet on is refused.
- **Clash warnings** — overlapping classes are flagged with the exact
  overlapping window, both as a standing panel and live while you fill the form.
  Adding one is still allowed; it's a heads-up, not a block. Days carrying work
  sessions from several projects are flagged too.
- **Light and dark** — a Light / Dark / System toggle in the header. The saved
  choice is applied before first paint, so there's no flash of the wrong theme.
- **Keyboard and screen reader** — the section switcher is a real tablist:
  arrow keys move between sections, Home and End jump to the ends, and only the
  active tab is a tab stop, so reaching the content doesn't mean pressing Tab
  past all seven. A **Skip to content** link comes first in the order. Results
  and errors from syncing, importing and scanning are announced rather than
  appearing silently, and an operating-system request for reduced motion
  shortens every transition.
- **Holidays cancel classes, and nothing else** — mark any date as a holiday
  and class reminders pause, the week view flags it, and the class drops out of
  the exported calendar. Your own tasks and projects carry on: a deadline
  doesn't move because campus is shut. Work sessions are in fact *steered
  towards* holidays — with no teaching that day the whole study window is free,
  so a holiday counts as the lightest possible day.
- **Google Calendar sync, both ways** — *push* writes classes into Google
  Calendar as weekly repeating events with 10-minute reminders, skipping
  holidays. *Pull* reads weekly repeating events back out, so a class added in
  Google Calendar or by a university feed lands in Academia too. Only repeating
  events become classes: a one-off meeting or an all-day entry isn't a timetable
  slot. Nothing is added until you confirm it — the calendar is shared with
  whatever else writes to it, so it doesn't get to rewrite your timetable
  unattended. Events Academia wrote itself are skipped, so a class you deleted
  here isn't resurrected by its leftover copy. Needs a Google OAuth client ID
  (see below); until one is set, use the export below.
- **Clearing up after a deleted class** — sync only ever adds and updates, so
  deleting a class leaves its event on the calendar for good. **Find leftover
  events** lists the Academia events no class here maps to, and deletes them
  once you confirm. Ownership comes from the event id, which is derived from
  the class id, so nothing the app didn't create is ever a candidate — an event
  with no id isn't either, since it couldn't be deleted by id anyway. It reads
  *this device's* timetable as the truth, so a class that lives only on another
  device will look leftover until you sync; the confirmation step exists for
  exactly that case. Deleting a repeating event removes the series, and Google
  keeps it in its bin for 30 days.
- **Google Calendar export** — download your timetable as a standard `.ics`
  file and import it into Google Calendar once. Google then syncs it to your
  phone and laptop, and each class carries a 10-minute reminder as a native
  calendar alarm, so alerts arrive even when Academia isn't open. Classes are
  exported as weekly recurring events, and marked holidays are excluded from
  them automatically. It's a one-way snapshot — re-export after changes.
- **Think** — capture small notes with a title and body, search them, and edit
  or delete them any time.
- **Resume builder** — fill in your details, education, experience, projects and
  skills; a live paper preview updates as you type. Everything saves locally so
  you can come back and edit any time, and "Download PDF" prints just the resume.

Tasks, classes, holidays and notes all support full create / edit / delete.

## Moving between devices

Academia stores everything in the browser it's open in, so a laptop and a phone
each keep their own copy — there is no server holding a shared account. The
**Devices** tab bridges that:

- a **QR code** of this site, to open it on your phone and add it to the home
  screen
- **Export / import a backup** file to carry data across. Import offers *merge*
  (keep both sides, matched by id, so importing twice changes nothing) or
  *replace*. Exporting is also the only guard against clearing your browser data.

### Signing in

**Sign in with Google** on the Devices tab and your planner follows the account
to every device you sign in on. There is deliberately no email/password signup:
that would mean storing password hashes and running a database, and a
hand-rolled auth layer on a static site is a liability. The account *is* your
Google account, and the data lives in your own Drive rather than on a server.

Once signed in, the planner pulls on load and pushes a few seconds after any
change. Every write is a merge, so a device that was offline contributes its
work instead of being overwritten.

### Automatic sync

With the Google client ID configured, **Sync across devices** keeps everything
in step through `appDataFolder` — a per-app hidden folder in your Drive. It uses
the `drive.appdata` scope, which Google classes as non-sensitive because it can
only ever touch files the app itself created; your other Drive files stay
invisible to it, and the folder doesn't appear in the Drive UI.

Each sync is read-merge-write: pull the stored copy, merge by id, write back.
Deletions are recorded as tombstones so removing something on one device isn't
undone by the other device still having it. Sync is manual — press the button
after making changes elsewhere. Editing the same entry on both devices before
syncing keeps the copy from whichever device you sync from.

## Google Calendar sync setup

Direct sync uses Google Identity Services' browser token flow, so it needs only
a **public OAuth client ID** — no client secret, and no backend.

1. In the [Google Cloud console](https://console.cloud.google.com), create a
   project and enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External) and add yourself as a test user.
3. Create an **OAuth client ID** of type *Web application*, listing your
   deployed URL as an authorised JavaScript origin.
4. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in your Vercel environment variables and
   redeploy.

The client ID is public by design and safe to expose. Without it, the sync panel
explains the setup and the `.ics` export continues to work.

## Install it on your phone

Academia is a PWA, so it installs to the home screen and opens fullscreen with
no address bar — like a native app.

- **iPhone / iPad** — open the site in Safari, tap **Share**, then
  **Add to Home Screen**. (iOS only offers this from Safari, not Chrome.)
- **Android** — Chrome shows an **Install app** button in the app itself, or
  use **⋮ → Add to Home screen**.

The app name and colours come from `app/manifest.ts`. The icons are PNGs picked
up by Next's file-based metadata:

| File | Size | Where it shows |
| --- | --- | --- |
| `src/app/icon.png` | 512×512 | PWA icon, `purpose: any` |
| `src/app/icon1.png` | 512×512 | Maskable — Android crops it to a circle |
| `src/app/apple-icon.png` | 180×180 | iOS home screen |
| `src/app/favicon.ico` | 32×32 | Browser tab |
| `public/logo.png` | 192×192 | The mark in the app's own header |

All five are the gold monogram on the app's `#0e1015`. Two of them have
constraints worth knowing before you replace them: the **maskable** icon is
cropped to a circle inscribed in the centre 80%, so its artwork is deliberately
smaller than the others and must never reach the edges; and **`logo.png` must be
opaque**, because it is layered over the placeholder crest in the header and a
transparent one would let that show through.

### Offline

`public/sw.js` caches the app shell and build assets, so Academia opens and
works with no connection — useful in a lecture hall with no signal. Since all
your data lives in the browser anyway, everything stays editable offline.

The worker is **network-first** for pages, so a new deploy is picked up as soon
as you're online again and a bad cache can't strand you on an old build. Only
content-hashed files under `/_next/static/` are served cache-first. Bump
`VERSION` in `public/sw.js` to force all clients onto a fresh cache.

It registers in production only — in development it would fight hot reloading.
To exercise it locally, run `npm run build && npm start` rather than
`npm run dev`.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — serve the production build
- `npm run lint` — run ESLint
- `npm run typecheck` — `tsc --noEmit`, which covers the tests too
- `npm test` — the unit tests
- `npm run check` — lint, typecheck and test in one go

## Tests

The planner's decisions — which day a work session lands on, what a mail is
allowed to change, which calendar events count as classes — are pure functions
over plain data, so they're tested directly with `node:test` and no test
framework.

`npm test` runs the TypeScript sources as they are. Node strips the types
itself, but it still resolves imports the ESM way, and the sources omit file
extensions throughout because they're written for a bundler.
`tools/ts-resolve.mjs` is a small resolve hook that retries `./x` as `./x.ts`,
which is what lets the suite run with no build step and no dependencies.

Several tests exist because something was actually wrong once: that ordinary
prose isn't read as a room number, that a quoted mail sentence survives an
abbreviation, and that holidays stay available for work. Those are the ones
worth keeping honest.
