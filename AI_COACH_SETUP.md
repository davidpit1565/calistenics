# AI Coach chat setup (do this at the office)

The score screen has a working "Ask the Coach About Your Score" chat — UI,
message history, and the score context are all built and tested. The
serverless proxy and client wiring are now **fully built and committed**
(`api/coach.js`, using Anthropic's Claude). The only thing left is to set
your own API key as a Vercel environment variable — nothing else to code.

## What this feature is (and isn't)
- The user can ask a follow-up question about the result they just got
  (e.g. "why was my range of motion low?").
- Only the typed question, the score breakdown for that one exercise
  (technique/range/control/tempo/reps), and the chat history for that
  session are sent — never video, never other personal data, never
  anything from elsewhere in the app. The Privacy Policy screen in the
  app already discloses this (all 4 languages).
- The API key is never in `index.html` or any client-side code — it lives
  only in the Vercel project's environment variables and is read by
  `api/coach.js`, which runs server-side.

## 1. Get an Anthropic API key
1. Go to **console.anthropic.com** → sign up / sign in.
2. Add a payment method (usage-based billing; a short coaching reply
   costs a fraction of a cent with the Haiku model this proxy uses).
3. **API Keys** → **Create Key** → name it (e.g. "Massa Coach") → copy it
   immediately (`sk-ant-...`) — Anthropic won't show it again.

## 2. Add it to Vercel
This repo already has `vercel.json` and is set up for Vercel deployment
(see `README.md`). Once this branch is merged to `main` (or whichever
branch Vercel deploys from):
1. Go to your project on **vercel.com** → **Settings** → **Environment
   Variables**.
2. Add a new variable: Name = `ANTHROPIC_API_KEY`, Value = the key you
   copied, Environment = Production (and Preview if you want it working
   on preview deployments too).
3. **Save**, then trigger a new deployment (Vercel → Deployments → the
   "..." menu on the latest one → **Redeploy**) so the function picks up
   the new environment variable.

That's it — no code changes needed. `api/coach.js` reads
`process.env.ANTHROPIC_API_KEY` automatically.

## 3. Native iOS app note
The native app loads `index.html` as a local bundle, not from your Vercel
URL — so a relative `fetch('/api/coach')` from inside the native app has
nothing to reach. Two options:
- **Simplest**: point `aiCoachConfig.endpoint` in `index.html` (search for
  it) at the full Vercel URL instead of the relative path, e.g.
  `https://your-project.vercel.app/api/coach` — works identically from
  both the web build and the native app. Do this once you know your
  Vercel project's URL, then resync `app-store-prep.zip` as usual.
- The web/PWA build (GitHub Pages, or Vercel itself) works either way
  since a relative path resolves correctly there.

## 4. Test
- **Web**: open the deployed site, finish an exercise, tap "Ask the Coach
  About Your Score", ask a question, confirm you get a real, relevant
  answer (not "not set up yet").
- **Native app**: after step 3's endpoint change and a fresh
  `npx cap sync ios` + rebuild, do the same test in the Xcode simulator
  or on a device.
