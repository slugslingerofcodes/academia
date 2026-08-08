# Academia — Tasks, Timetable & Holidays

A student planner built with [Next.js](https://nextjs.org). Everything is stored
locally in the browser (localStorage) — no account or backend needed.

## Features

- **Class-aware scheduling** — generated work sessions steer around your
  timetable: within each evenly-spaced slot they pick your lightest teaching
  day, and take the largest class-free window on it.
- **Tasks & Projects** — start a task or project over any period and Academia
  generates a timetable: work sessions spread evenly across the dates, skipping
  weekends (optional) and marked holidays. Check sessions off to track progress.
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
  open at that hour. On a holiday it still reports deadlines — those don't move
  for a day off — while classes and planned work stay muted.
- **Clash warnings** — overlapping classes are flagged with the exact
  overlapping window, both as a standing panel and live while you fill the form.
  Adding one is still allowed; it's a heads-up, not a block. Days carrying work
  sessions from several projects are flagged too.
- **Light and dark** — a Light / Dark / System toggle in the header. The saved
  choice is applied before first paint, so there's no flash of the wrong theme.
- **Holidays** — mark any date as a holiday. Reminders pause on that day, the
  week view flags it, and newly generated timetables skip it.
- **Google Calendar sync** — write classes straight into Google Calendar as
  weekly repeating events with 10-minute reminders, skipping holidays. Needs a
  Google OAuth client ID (see below); until one is set, use the export below.
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

The app icon, name and colours come from `app/manifest.ts`, with the icons
generated at build time by `app/icon.tsx`, `app/icon1.tsx` (maskable) and
`app/apple-icon.tsx` — no binary image assets required.

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
