# Premium subscription setup (do this at the office)

The Premium paywall — screen, copy in all 4 languages, gating on the AI
Coach chat and the level-3/4 Structured Programs, the first-workout trigger,
and honest "not set up yet" purchase/restore stubs — is **fully built and
committed**. Nothing in `index.html` fakes a purchase or grants free access.
What's missing is the real subscription product and the RevenueCat plugin
that talks to it, both of which need a live App Store Connect + RevenueCat
account session and can't be done from a code-only session.

## What this feature is (and isn't)

- **Free forever**: the full 67-exercise library + videos, all "level"
  exercises, daily challenges, race mode, and the basic Structured Programs
  (`levelReq: 1` and `2` — beginner_full_body, pushup_builder_30,
  first_pullup_6wk, core_hollow_mastery, flexibility_mobility), plus basic
  progress tracking/stats/achievements, Apple Health sync, and notifications.
- **Premium-only**: the AI Coach chat ("Ask the Coach About Your Score") and
  the higher-tier Structured Programs (`levelReq: 3` and `4` —
  handstand_foundations, planche_progression, explosive_power,
  lever_foundations, muscleup_mastery).
- The paywall never appears on first open or during onboarding — it shows
  the first time a user completes their first-ever workout (right after
  they've seen their score, never blocking it), or any time they tap a
  locked premium feature. A proactive re-show of the paywall (not a
  same-tap contextual one) is throttled to roughly once every 4 days
  (`PAYWALL_REPROMPT_COOLDOWN_MS` in `index.html`) — tapping a locked
  feature again always shows it immediately regardless of that cooldown.
- `isPremiumUser()` is the single gating check used everywhere. `premiumStatus.isPremium`
  is **never** set to `true` by any client-side code path other than a real
  purchase/restore result — there is no toggle, dev flag, or URL parameter
  that grants it. That's deliberate: a client-side "premium" flag with no
  server-verified purchase behind it is a trivial piracy hole.

## 1. Create a RevenueCat account

1. Go to **app.revenuecat.com** → sign up (free tier covers this app's
   scale easily).
2. Create a new **Project** (e.g. "Massa Calisthenics").
3. Under **Project Settings → Apps**, add an **App Store** app entry — you'll
   need your app's **Bundle ID** (from `capacitor-app/ios/App/App.xcodeproj`,
   already set during the original Capacitor setup) and, once you have it, an
   **App Store Connect API key** (Users and Access → Integrations → App Store
   Connect API in App Store Connect → generate one with the "App Manager"
   role) so RevenueCat can read subscription status server-side.

## 2. Create the subscription product in App Store Connect

1. In **App Store Connect** → your app → **Monetization → Subscriptions**.
2. Create a **Subscription Group** (e.g. "Massa Premium") — a group is
   required even for a single subscription tier.
3. Inside it, create one subscription:
   - **Reference name**: e.g. "Massa Premium Annual" (internal only).
   - **Product ID**: e.g. `com.massacalisthenics.premium.annual` — pick
     something permanent, this cannot be changed later.
   - **Duration**: 1 year.
   - **Price**: set your annual price (the paywall currently shows
     `$39.99/year` as placeholder copy in `index.html` — update the
     `premium_price_annual` / `premium_price_monthly_equiv` /
     `premium_trial_disclosure` keys in all 4 languages once you've set the
     real price, so the displayed price always matches what App Store
     Connect actually charges — a mismatch there is an App Review
     rejection).
   - **Localized display name & description**: required per-locale
     (at minimum en; add he/nl/es to match the app's languages once you're
     ready to sell in those store locales too — the in-app UI is already
     translated in all 4 regardless).
   - **Introductory Offer**: add a **7-day Free Trial** ("Pay Up Front":
     none — free trial type) — this is what the paywall's copy promises
     ("7 days free, then $X/year"), so the trial length configured here
     must match `premium_trial_disclosure` in `index.html` exactly.
4. Submit the subscription for review (subscriptions are reviewed alongside
   your next app binary submission, not standalone).

## 3. Connect RevenueCat to App Store Connect

1. Back in RevenueCat, under your app's **App Store** configuration, paste
   the App Store Connect API key from step 1.
2. Under **Products**, add the Product ID you created in step 2 — RevenueCat
   will pull its price/duration/trial info automatically once App Store
   Connect approves it.
3. Create an **Entitlement** (e.g. `premium`) and attach the product to it.
   This is the identifier the code below checks
   (`customerInfo.entitlements.active['premium']`) — if you name it
   differently, update that string in `index.html` to match.
4. Create an **Offering** (e.g. `default`) with a **Package** (e.g.
   `$rc_annual`) pointing at the product — `purchasePremium()` below fetches
   the current offering and purchases that package.
5. Under **API Keys**, copy the **Public app-specific API key** (starts with
   `appl_`) — this is safe to embed in client code (it's a
   publishable-style key, not a secret).

## 4. Install the plugin and initialize it

From `capacitor-app/`:
```bash
npm install @revenuecat/purchases-capacitor
npx cap sync ios
```
(Verified current package name/version via npm as of this write-up:
`@revenuecat/purchases-capacitor`, currently in the 13.x line — check
**npmjs.com/package/@revenuecat/purchases-capacitor** for the latest before
installing.)

Initialize it once at app startup (e.g. near where `Capacitor` plugins are
otherwise touched in `index.html`, or in `capacitor-app`'s own bootstrap
code if there is one):
```js
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

await Purchases.configure({ apiKey: 'appl_YOUR_PUBLIC_KEY' });
```
Once this runs, `window.Capacitor.Plugins.Purchases` exists and
`getPurchasesPlugin()` in `index.html` (search for it) stops returning
`null` — that's the single switch that turns the stubs below into live code
paths; no other detection logic needs to change.

## 5. Wire the real purchase/restore calls

Everything is already scaffolded with the exact TODO comments in place —
search `index.html` for `purchasePremium`, `restorePurchases`, and
`getPurchasesPlugin`. Each stub currently shows the honest
`"Subscriptions aren't set up yet — see PREMIUM_SETUP.md"` toast
(`premium_not_configured` key, all 4 languages) when
`getPurchasesPlugin()` returns `null`. Replace the body of each function
with the real calls once steps 1-4 are done:

```js
async function purchasePremium() {
    const plugin = getPurchasesPlugin();
    if (!isNativeApp() || !plugin) {
        showToast(t('premium_not_configured') || "Subscriptions aren't set up yet — see PREMIUM_SETUP.md");
        return;
    }
    try {
        const offerings = await plugin.getOfferings();
        const pkg = offerings.current?.annual || offerings.current?.availablePackages?.[0];
        if (!pkg) { showToast(t('premium_not_configured')); return; }
        const { customerInfo } = await plugin.purchasePackage({ aPackage: pkg });
        if (customerInfo.entitlements.active['premium']) {
            premiumStatus = {
                isPremium: true,
                trialActive: customerInfo.entitlements.active['premium'].periodType === 'TRIAL',
                trialEndsAt: customerInfo.entitlements.active['premium'].expirationDate || null,
                source: 'revenuecat'
            };
            saveToStorage();
            showScreen(paywallReturnScreen || 'screen-dashboard');
        }
    } catch (e) {
        if (!e.userCancelled) showToast(t('premium_not_configured'));
    }
}

async function restorePurchases() {
    const plugin = getPurchasesPlugin();
    if (!isNativeApp() || !plugin) {
        showToast(t('premium_not_configured') || "Subscriptions aren't set up yet — see PREMIUM_SETUP.md");
        return;
    }
    try {
        const { customerInfo } = await plugin.restorePurchases();
        if (customerInfo.entitlements.active['premium']) {
            premiumStatus = { isPremium: true, trialActive: false, trialEndsAt: null, source: 'revenuecat' };
            saveToStorage();
            showToast(t('premium_restored') || 'Premium restored!');
        } else {
            showToast(t('premium_restore_none') || 'No active subscription found.');
        }
    } catch (e) {
        showToast(t('premium_restore_none') || 'No active subscription found.');
    }
}
```

Also add a startup check (once, after `Purchases.configure`) so premium
status reflects reality even if the user never taps "Restore" — something
like:
```js
const info = await Purchases.getCustomerInfo();
if (info.customerInfo.entitlements.active['premium']) {
    premiumStatus = { isPremium: true, trialActive: false, trialEndsAt: null, source: 'revenuecat' };
    saveToStorage();
}
```

## 6. Apple's disclosure rules — already satisfied in the built UI, verify after you set real pricing

Per developer.apple.com/app-store/subscriptions:
- The full-period price (`$X/year`) is the largest, most prominent element
  on the paywall (`.paywall-price-annual`) — the monthly-equivalent is
  smaller/secondary (`.paywall-price-monthly-equiv`).
- The trial length and post-trial price are stated in one sentence before
  purchase (`premium_trial_disclosure`).
- **Restore Purchases** is a visible, non-buried button (not hidden in a
  menu).
- A clear dismiss/decline path exists (✕ close button and "Maybe Later").
- No countdown timers or "limited time" claims anywhere in the paywall.

If you change the price or trial length in App Store Connect, update the
matching `premium_price_annual` / `premium_price_monthly_equiv` /
`premium_trial_disclosure` strings in all 4 languages in `index.html` so the
UI never states a price/trial that doesn't match what's actually charged —
a mismatch here is a real App Review rejection risk, not just a copy nit.

## 7. Native iOS app note

Same situation as `AI_COACH_SETUP.md`'s note: the native app loads
`index.html` as a local bundle. RevenueCat's Capacitor plugin talks directly
to StoreKit on-device (not to your Vercel deployment), so no endpoint URL
needs to change for this feature — just make sure `npx cap sync ios` has
run after `npm install` so the plugin's native code is in the Xcode project,
then rebuild in Xcode.

## 8. Test

- **Web/PWA build (no plugin)**: tap the paywall's trial CTA — confirm it
  shows the honest "not set up yet" toast and does not crash or grant
  premium.
- **TestFlight/Sandbox on a real device**, after steps 1-5: use an App Store
  Connect **Sandbox Tester** account (Users and Access → Sandbox → Testers)
  signed into the device's App Store, not your real Apple ID. Sandbox trials
  and renewals are accelerated (a 7-day trial becomes minutes) so you can
  verify the whole lifecycle quickly:
  - Complete the purchase flow, confirm `premiumStatus.isPremium` becomes
    `true` and the AI Coach chat / level-3+ programs unlock immediately.
  - Delete and reinstall the app, tap **Restore Purchases**, confirm premium
    comes back without a new charge.
  - Let a sandbox trial lapse without confirming a renewal, confirm the app
    can detect that the entitlement is no longer active (add a periodic
    `getCustomerInfo()` re-check on app foreground if you want this reflected
    without requiring the user to reopen the paywall).
