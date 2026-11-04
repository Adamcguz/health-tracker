# Health Tracker App — PRD

Nov 4, 2026 · @Adam

## Overview

A single-user, phone-first web app that sets personal health targets from Adam's stats, logs food, water and workouts with minimal friction, and shows a live "finish line" for his goal weight that moves as the data comes in.

**Goals**

- Logging any entry (a meal, a glass of water, a set) takes under 15 seconds on a phone.
- Targets (calories, food groups, water, exercise) are calculated from his profile, not hard-coded.
- The summary page always answers: am I on track today, this week, and toward the goal date?

**Non-goals (v1)**

- Multiple users, social features, accounts or logins.
- Barcode scanning, wearable/Apple Health sync (possible v2).
- Medical diagnosis or advice.

**Health guardrails (build these in, don't make them optional)**

- Calorie target never drops below 1,500 kcal/day for a male profile (1,200 female), regardless of the goal.
- Weight-loss rate is capped at 1% of body weight per week, max 2 lb/week.
- The app shows a one-time note that targets are general estimates and to check with a doctor before big diet or training changes.

## Platform & architecture

Build a Progressive Web App (PWA) hosted on GitHub Pages, installed to the iPhone home screen, plus one small Cloudflare Worker for the two things a static site can't do: AI food analysis and scheduled reminders.

| Decision | Choice | Why |
| --- | --- | --- |
| App type | PWA (React + TypeScript + Vite, `vite-plugin-pwa`) | Installs like an app from GitHub Pages; no App Store needed |
| Hosting | GitHub Pages, deployed by a GitHub Action on push to `main` | Free; note free Pages requires a public repo, which is fine because no personal data lives in the code |
| Data storage | IndexedDB on the phone via Dexie.js | Works offline; data never leaves the device |
| Backup | One-tap JSON export/import in Settings, plus a weekly "back up now" nudge | iOS can clear web-app storage; a backup file prevents losing history |
| Food analysis | Worker endpoint that sends the meal text to the Claude API (Claude Haiku 5.5, the cheapest model) and returns structured JSON (calories, food-group servings, protein) | An API key can't sit in a public front end; the Worker keeps it secret |
| Reminders | v1: iPhone Shortcuts automations that show a notification; the app opens to the due check-in (see Reminder setup). v2: Worker cron + Web Push | A static site can't send notifications on a schedule; Web Push on iOS needs a server and the app installed to the home screen |
| Charts | Recharts | Lightweight, React-native |
| Styling | Tailwind CSS, mobile-first, dark mode, large tap targets | One-handed logging |

**Fallbacks:** if the Worker is unreachable, meals save as text and are marked "needs analysis," then re-analyzed when back online. Every AI estimate is editable.

**Cost cap (hard requirement):** total running cost must stay under $5/month. Expected cost is well under $0.25/month (about 150 analyses a month at Haiku 5.5's $0.10 / $0.50 per million input/output tokens). Set a $5 monthly spend limit in the Anthropic Console; the Worker also refuses more than 30 analyses a day. Cloudflare's free Workers plan covers the rest. Settings shows this month's analysis count.

## Feature 1: Profile & targets engine

Onboarding collects a few stats, and a pure TypeScript module (`targets.ts`, fully unit-tested) turns them into every daily and weekly target the app uses. All constants live in one config file so they can be tuned.

**Onboarding inputs:** height, current weight, age, sex (needed for the calorie formula), activity level (5 options with plain-English descriptions), units (lb/in default), goal weight (the app suggests one from age, height and sex; he can lower the ambition if the change feels too big), and pace. Pace is chosen from three cards, each showing its lb/week, daily calorie target and projected finish date, so he sees what each choice means before picking.

**Calculations**

1. **Healthy weight range** from BMI 18.5–24.9. Show the range and a suggested goal; let the user override it, since BMI doesn't account for muscle.

```latex
\text{weight}_{lb} = \text{BMI} \times \frac{\text{height}_{in}^2}{703}
```

2. **Resting calories (BMR)** with Mifflin-St Jeor (kg, cm, years; +5 for male, −161 for female).

```latex
\text{BMR} = 10w + 6.25h - 5a + s
```

3. **Maintenance calories (TDEE)** = BMR × activity factor: 1.2 sedentary, 1.375 light, 1.55 moderate, 1.725 very active, 1.9 extra active.
4. **Rate of loss:** slow 0.5 lb/wk, steady 1 lb/wk (default), aggressive up to 2 lb/wk, never more than 1% of current body weight per week.
5. **Daily deficit:** rate × 500 kcal (1 lb ≈ 3,500 kcal). Calorie target = TDEE − deficit, floored at 1,500 (male) / 1,200 (female). If the floor kicks in, the app uses the slower rate the floor allows and says so.
6. **Protein:** 0.7 g per lb of goal weight (supports keeping muscle while lifting).
7. **Food groups:** daily servings from the USDA MyPlate pattern nearest the calorie target (table below), plus limits: added sugar under 10% of calories, sodium under 2,300 mg.
8. **Exercise:** 150–300 min/week moderate cardio (or 75–150 vigorous), strength training 2+ days/week, and a steps target (default 8,000/day, editable).
9. **Water:** 0.5 oz per lb of body weight (minimum 64 oz), plus 12 oz per 30 min of exercise that day. Glass size is a setting (default 8 oz).
10. **Recalculate** all targets after each weigh-in.

| Calories/day | Fruit (cups) | Vegetables (cups) | Grains (oz-eq, half whole) | Protein (oz-eq) | Dairy (cups) |
| --- | --- | --- | --- | --- | --- |
| 1,600 | 1.5 | 2 | 5 | 5 | 3 |
| 1,800 | 1.5 | 2.5 | 6 | 5 | 3 |
| 2,000 | 2 | 2.5 | 6 | 5.5 | 3 |
| 2,200 | 2 | 3 | 7 | 6 | 3 |
| 2,400 | 2 | 3 | 8 | 6.5 | 3 |
| 2,600 | 2 | 3.5 | 9 | 6.5 | 3 |

These patterns come from the 2020–2025 Dietary Guidelines, entered from memory. Before building, verify them against the current guidelines at myplate.gov, since a newer edition may change the numbers.

## Feature 2: Food log

Four check-ins a day (Breakfast, Lunch, Dinner, Bedtime snacks); each one is a free-text box like "2 eggs, toast with butter, coffee with milk" that the AI breaks into items, calories and food groups.

**Check-ins**

- Default reminder times: 9:00 AM, 1:00 PM, 7:00 PM, 10:00 PM, editable in Settings.
- On launch, the app opens straight to the most recent unlogged check-in, so tapping the app icon after a reminder lands on the right meal.
- Options on each check-in: log it, "skipped this meal," or "same as yesterday / a saved meal."
- Snacks can be added any time, not only at bedtime.
- The Today screen shows four meal cards: empty, logged, or skipped.

**Analysis (per entry)**

- Worker returns JSON: a list of items, each with estimated portion, calories, protein (g), food-group servings (fruit, vegetables, grains with whole/refined, protein, dairy), and flags for added sugar or high sodium.
- Show the breakdown immediately; every number is tappable to correct.
- Ask follow-up only when portion is truly unclear ("How big was the bowl?" with small / medium / large chips).
- Save corrected items to a personal foods library so repeats are instant and consistent.

**End-of-day report** (shown after the bedtime check-in, or on demand)

- Calories eaten vs. target, with remaining or over.
- Each food group: target vs. actual, labeled Short, On target, or Over.
- Protein vs. target; added sugar and sodium flags.
- Two or three plain-language takeaways, e.g. "No vegetables today — you were 2.5 cups short" or "Grains were 3 oz over, mostly refined."
- A 7-day view of which groups are most often short.

## Feature 3: Water

One big "+1 glass" button, reachable from every screen, logs water in a single tap; the day's target comes from Feature 1.

- Persistent floating button adds one glass (default 8 oz, set in Settings); long-press offers other sizes (12, 16, 24 oz, custom).
- Undo toast for 5 seconds after each tap.
- Today view: a fill ring showing oz drunk vs. target and glasses remaining.
- Target rises automatically on days with a logged workout.
- Optional gentle nudge at 3 PM if under 40% of target.
- History: daily hit/miss, current streak, and 7-day average.

## Feature 4: Activity & workouts

Log daily steps, cardio and lifting sessions, check them against the Feature 1 benchmarks, and chart each lift's progress over time (e.g. bench 3×10 at 125 lb one week, 3×10 at 145 lb the next).

**Daily steps**

- One number entry per day (manual in v1); progress bar vs. steps target.

**Cardio entry**

- Type (walk, run, bike, etc.), duration in minutes, intensity (moderate or vigorous). Vigorous minutes count double toward the weekly 150-minute goal.

**Strength entry**

- Pick an exercise from a list (searchable, with custom exercises allowed).
- Log sets as rows of weight × reps; "copy last set" and "repeat last session" buttons.
- Saved routines (e.g. a Day A / Day B full-body split) load all exercises at once, pre-filled with last session's numbers.

**Benchmarks (weekly, resetting Monday)**

| Benchmark | Default target | Shown as |
| --- | --- | --- |
| Cardio minutes | 150 moderate-equivalent | Progress bar |
| Strength days | 3 | Dots for each day |
| Steps | 8,000/day | Daily bar + weekly average |

**Lift progression**

- Per-exercise page: chart of top-set weight and estimated one-rep max over time, plus a session history table.
- Estimated one-rep max (Epley) lets different rep schemes be compared:

```latex
\text{e1RM} = \text{weight} \times \left(1 + \frac{\text{reps}}{30}\right)
```

- Also track total volume (sets × reps × weight) per session.
- Celebrate personal records (heaviest weight for a rep count, best e1RM) with a badge.
- Flag a stall when an exercise hasn't improved in 3 sessions.

## Feature 5: Summary & the moving finish line

The home screen shows a projected goal date (the finish line) that recalculates on every entry, moving later after slip-ups and earlier when he's ahead, alongside separate eating and workout progress.

**Weigh-ins (added — needed for the finish line)**

- Quick weight entry; 3 mornings a week (Mon/Wed/Fri) after waking, before eating.
- The app tracks a **trend weight** (7-day exponential moving average) so a salty dinner or water swing doesn't jerk the finish line around.

**How the finish line is calculated**

1. Planned date: set at onboarding from (current − goal weight) ÷ chosen rate. Stays visible as a ghost marker.
2. Projected date, early on (under 3 weeks of weigh-ins): from logged calories, using actual average daily deficit ÷ 500 = lb/week.
3. Projected date, after 3 weeks: blend toward the real trend-weight slope over the last 21 days, which is more honest than calorie estimates.
4. Recalculate on every food, workout or weight entry; show the change as "+4 days" or "−2 days" with a one-line reason (e.g. "Over target by 700 kcal yesterday").
5. If the trend is flat or rising for 2+ weeks, show "no projection yet" with what's driving it, rather than an absurd date.

**Layout (top to bottom)**

- Finish-line track: start weight → trend weight ("you are here") → goal, with planned vs. projected dates.
- Today at a glance: calories left, water ring, steps, meals logged (4 dots).
- Eating progress: days on calorie target this week (within ±10%), food-group adherence %, protein average.
- Workout progress: cardio minutes, strength days, steps average, recent PRs.
- Trend chart: trend weight with daily weigh-ins as faint dots, and the goal line; toggle 4 weeks / 3 months / all.
- Weekly recap card every Monday: wins, misses, and how the finish line moved.

## Data model

Eight IndexedDB tables cover everything; dates are stored as local `YYYY-MM-DD` strings so a "day" always means his day.

| Table | Key fields |
| --- | --- |
| `profile` | heightIn, sex, birthDate, activityLevel, goalWeightLb, pace, units, glassOz, reminderTimes, createdAt |
| `weighIns` | id, date, weightLb, trendWeightLb |
| `targets` | date effective, calories, proteinG, foodGroups {fruit, veg, grains, protein, dairy}, waterOz, cardioMinWeek, strengthDaysWeek, stepsDay |
| `meals` | id, date, slot (breakfast / lunch / dinner / snack), rawText, status (logged / skipped / needs-analysis), items\[\] {name, portion, kcal, proteinG, groups{}, flags\[\]} |
| `foodsLibrary` | id, name, portion, kcal, proteinG, groups{}, timesUsed |
| `water` | id, date, timestamp, oz |
| `activity` | id, date, kind (steps / cardio), steps or {type, minutes, intensity} |
| `strengthSets` | id, date, sessionId, exercise, setIndex, weightLb, reps, e1RM |

Targets are versioned by date so history is always judged against the targets that were in effect that day.

## Build phases for Claude Code

Build in six phases, each ending with something usable on the phone; ask Claude Code to finish and deploy one phase before starting the next.

1. **Skeleton & deploy:** Vite + React + TS + Tailwind PWA, bottom tab nav (Today, Food, Workouts, Summary, Settings), GitHub Action deploying to Pages, installable on iPhone. Done when it opens from the home screen offline.
2. **Profile & targets:** onboarding flow, `targets.ts` with unit tests for every formula in Feature 1, Settings to edit inputs. Done when targets display and tests pass.
3. **Water & weigh-ins:** +1 glass button, water ring, weight entry, trend weight. Done when a full day of water can be logged in taps.
4. **Workouts:** steps, cardio, strength logging, routines, benchmarks, per-exercise progress charts and PRs.
5. **Food log:** Cloudflare Worker with Claude API proxy (key in Worker secrets, CORS locked to the Pages domain), meal entry, editable breakdown, foods library, end-of-day report, deep links per meal; then set up the four iPhone reminder automations.
6. **Summary & finish line:** dashboard, projection logic with tests (including flat-trend and early-data cases), weekly recap, JSON backup/restore.

**Later (v2):** Web Push reminders from the Worker, Apple Health step import via a Shortcut, photo-of-meal logging, cloud sync.

## Decisions & reminder setup

All open questions are settled; Claude Code should build to these answers.

| Question | Decision |
| --- | --- |
| Phone | iPhone |
| AI food analysis | Yes, Claude API via Cloudflare Worker, with a hard $5/month cap (see Platform) |
| Reminders | iPhone Shortcuts automations for v1 |
| Goal weight | App suggests one from age, height and sex; user can adjust it |
| Pace | Three option cards showing what each pace means; the app labels the pace he's actually on from his data |
| Weigh-ins | 3x/week, Mon/Wed/Fri mornings |
| Glass size | 8 oz |
| Import history | No, start fresh |
| Strength benchmark | 3 days/week |

### Reminder setup (iPhone Shortcuts)

One automation per reminder: five total (four meals plus weigh-ins). Menu labels can differ slightly by iOS version.

1. Install the app first: open its GitHub Pages link in Safari, tap Share, then Add to Home Screen.
2. Open the **Shortcuts** app and tap the **Automation** tab at the bottom.
3. Tap **+** (New Automation) and choose **Time of Day**.
4. Set the time to 9:00 AM, Repeat **Daily**, and pick **Run Immediately** (turn off "Notify When Run"). Tap **Next**.
5. Choose **New Blank Automation**, tap **Add Action**, search for **Show Notification**, and add it.
6. Replace the notification text with "Log breakfast" and tap **Done**.
7. Repeat steps 3–6 for Lunch (1:00 PM), Dinner (7:00 PM), and Snacks (10:00 PM).
8. For weigh-ins: same steps at 7:00 AM, but set Repeat to **Weekly** and select Monday, Wednesday and Friday; text "Weigh in".
9. When a notification arrives, open the app from your home screen; it jumps to whatever check-in is due.

Why not open the app directly from the shortcut: iOS opens links from Shortcuts in Safari, which keeps separate storage from the home-screen app, so entries would land in the wrong place. True tap-to-open notifications come with Web Push in v2.
