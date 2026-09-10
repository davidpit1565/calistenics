# AI Coach chat setup (do this at the office)

The score screen now has a working "Ask the Coach About Your Score" chat —
UI, message history, and the score context are all built and tested. It
needs a real LLM connected before it can actually answer anything; right
now it honestly says "not set up yet" instead of pretending to work.

## What this feature is (and isn't)
- The user can ask a follow-up question about the result they just got
  (e.g. "why was my range of motion low?").
- Only the typed question, the score breakdown for that one exercise
  (technique/range/control/tempo/reps), and the chat history for that
  session are sent — never video, never other personal data, never
  anything from elsewhere in the app.
- This is a genuinely new feature, not a bug fix — it requires an LLM
  provider account and API key, which only the account owner can create.

## 1. Pick a provider
Any of these work — the code (`askAICoach()` in `index.html`, search for
`aiCoachConfig`) expects a simple `{question, context, history}` POST and
a `{answer}` JSON response, so whichever you pick needs a thin adapter
matching that shape:
- **Anthropic (Claude)** — https://console.anthropic.com — pay-per-token,
  a new account gets a small free credit grant.
- **OpenAI (GPT)** — https://platform.openai.com — same model, pay-per-token,
  also has a free trial credit for new accounts.

Neither is unconditionally "free forever" for real usage — a few cents
per conversation is typical for a short coaching Q&A, but it's not zero
once free trial credit runs out.

## 2. Security — do not put the API key directly in `index.html`
This app has no backend today (everything is local/client-side). Putting
a real LLM API key straight into client-side JavaScript means anyone can
extract it from the page source and run up your bill. Two real options:

- **Recommended: a tiny serverless proxy** — one small function (Vercel
  Edge Function, Cloudflare Worker, or a Firebase Cloud Function, since a
  Firebase project already exists for auth) that holds the API key
  server-side, receives `{question, context, history}` from the app,
  calls the LLM provider, and returns `{answer}`. Then set
  `aiCoachConfig.endpoint` in `index.html` to that function's URL and
  leave `aiCoachConfig.apiKey` empty (the key lives only on the server).
- **Quick-and-dirty for internal testing only**: set `aiCoachConfig.apiKey`
  directly for a first test on your own device — but do not ship this to
  the App Store as-is; it exposes the key to anyone who inspects the app.

## 3. Wire it in
1. In `index.html`, find `const aiCoachConfig = { apiKey: null, endpoint: null };`.
2. Set `endpoint` to your proxy function's URL (see step 2).
3. If you went with the "quick test" option instead, set `apiKey` too and
   adjust `askAICoach()`'s `fetch()` call to match your chosen provider's
   actual request format (Anthropic and OpenAI have slightly different
   request/response shapes — the current code assumes a proxy that
   normalizes this to `{answer}` for you).
4. Update the in-app Privacy Policy (`legalContent`, all 4 languages) to
   disclose this new data flow once it's live — the question text and
   score breakdown will now leave the device to the LLM provider. This
   wasn't done yet since the feature sends nothing while unconfigured.
5. Resync `app-store-prep.zip` the same way as every other `index.html`
   change (copy into `www/`, iOS `public/`, Android `assets/public/`,
   rebuild the zip) before building in Xcode.

## 4. Test
- Open the score screen after a completed exercise, tap "Ask the Coach
  About Your Score", ask a question, confirm you get a real answer back
  (not the "not set up yet" message) and that it's actually relevant to
  the score breakdown you passed in as context.
