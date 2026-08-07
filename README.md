# Academia — Tasks, Timetable & Holidays

A student planner built with [Next.js](https://nextjs.org). Everything is stored
locally in the browser (localStorage) — no account or backend needed.

## Features

- **Tasks & Projects** — start a task or project over any period and Academia
  generates a timetable: work sessions spread evenly across the dates, skipping
  weekends (optional) and marked holidays. Check sessions off to track progress.
- **Weekly Timetable** — add your classes (subject, day, time, room) and see the
  current week at a glance, with today highlighted.
- **Class reminders** — browser notifications fire 10 minutes before each class.
  Keep the app open in a tab; reminders are deduped per class per day.
- **Holidays** — mark any date as a holiday. Reminders pause on that day, the
  week view flags it, and newly generated timetables skip it.
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
