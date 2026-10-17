# Goal Track

A personal goal tracker: goals with SMART fields, a dated plan with reminders, notes under every goal and step, voice-to-text, and a wins journal for the thoughts and feelings after each achievement.

Built with Next.js 15 (App Router), TypeScript and Three.js. Deploys to Vercel with no configuration.

## Security

The whole app sits behind a master password. Nothing loads, not even the app code, until you unlock it.

- **APP_PASSWORD** (required): your master password. Set it in Vercel under Settings, then Environment Variables, and redeploy. Until it exists, the site shows a setup notice and stays closed.
- **AUTH_SECRET** (optional): a long random string that signs the session cookie. Without it, the password signs the cookie, so a password change signs out every device.
- Sessions last 30 days. The app also locks itself after a period without use (30 minutes by default, adjustable in Settings), and the Lock button locks it at once.
- Wrong passwords are slowed down, pages carry noindex headers, and robots.txt blocks search engines.

## What's in it

- **Overview**: a live countdown to your focus goal (the CGRC exam, 29 January 2027, 9:00), a Three.js orbit where the ring fills as you finish steps and your other goals circle as moons, what's next, and a quick voice note.
- **Goals**: Active, Up next, Later and Achieved. Each goal has SMART fields, a website link (e.g. your practice site), a plan, notes and its wins.
- **Plan**: every scheduled step grouped by week, filterable by goal. Missed steps show **Reschedule** so you can reschedule them.
- **Wins**: when you tick a step, you're asked how you feel and what you think. Those reflections collect here.
- **Voice to text**: tap the mic in any note or reflection box and speak. It uses the browser's built-in speech recognition (Chrome on Android works well). Pick your accent in Settings.
- **Reminders**: in-app and system notifications while the app is open or in the background. For alarms that fire even when the app is closed, use **Settings → Add the plan to your phone calendar**, which downloads an `.ics` file with alarms for Google Calendar.
- **Your data** lives on your device (localStorage). Use **Settings → Back up / Restore** to move it between devices.

## Starter plan

- **CGRC retake**: 15 weeks of sessions from Monday 19 October 2026. Monday, Wednesday and Friday evenings at 7:00 PM plus a Saturday 9:00 AM block, following the seven domains in RMF order, with mock exams on 5 Dec, 2 Jan, 9 Jan, 16 Jan and 23 Jan. The first week is lighter for recovery. All times and dates are editable.
- **CEH**: up next, with a planning session on 1 February 2027.
- **Later**: YouTube channels (Readers Mind, Psychagogy, Pneuma, Only Geniuses), Readersmind website, digital products (PDFs, Excel sheets, books), apps (student budget, ADHD, pet, homekeeper), companies and holdings.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Go to https://vercel.com/new and sign in with GitHub.
2. Import the `goal-track` repository. Vercel detects Next.js automatically.
3. Add the `APP_PASSWORD` environment variable.
4. Press **Deploy**. Every push to `main` redeploys.

On your phone, open the Vercel URL in Chrome and choose **Add to Home screen** to install it like an app. Allow the microphone when you first tap the mic, and turn on notifications in Settings.

## Project layout

```
app/            layout, page, global styles, icon
components/     GoalApp (views), Sheets (goal, plan item, win, settings), OrbitScene (Three.js), Countdown, VoiceInput
lib/            types, seed plan, local storage, dates, reminders, .ics export
public/         service worker, manifest, app icons
```
