# Ledger — Tasks, Timetable & Holidays

A student planner built with [Next.js](https://nextjs.org). Everything is stored
locally in the browser (localStorage) — no account or backend needed.

## Features

- **Tasks & Projects** — start a task or project over any period and Ledger
  generates a timetable: work sessions spread evenly across the dates, skipping
  weekends (optional) and marked holidays. Check sessions off to track progress.
- **Weekly Timetable** — add your classes (subject, day, time, room) and see the
  current week at a glance, with today highlighted.
- **Class reminders** — browser notifications fire 10 minutes before each class.
  Keep the app open in a tab; reminders are deduped per class per day.
- **Holidays** — mark any date as a holiday. Reminders pause on that day, the
  week view flags it, and newly generated timetables skip it.
- **Think** — capture small notes with a title and body, search them, and edit
  or delete them any time.
- **Resume builder** — fill in your details, education, experience, projects and
  skills; a live paper preview updates as you type. Everything saves locally so
  you can come back and edit any time, and "Download PDF" prints just the resume.

Tasks, classes, holidays and notes all support full create / edit / delete.

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
