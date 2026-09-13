# Apple Health (HealthKit) Setup

This app now has real HealthKit integration for the native iOS build, using
the [`@capgo/capacitor-health`](https://github.com/Cap-go/capacitor-health)
plugin (actively maintained, versioned to track `@capacitor/*` — this project
pins `^8.10.6` to match Capacitor 8.5.x).

## What already works (done in code, no Xcode needed)

- `capacitor-app/package.json` — `@capgo/capacitor-health` dependency added.
- `capacitor-app/ios/App/App/Info.plist` — added
  `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` with
  honest, specific copy (steps read, workouts read/written — nothing else).
- `capacitor-app/ios/App/App/App.entitlements` — created, with
  `com.apple.developer.healthkit` set to `true`. The Xcode project
  (`project.pbxproj`) already points `CODE_SIGN_ENTITLEMENTS` at this file
  for both Debug and Release, so Xcode will pick it up as soon as the
  project is opened.
- `index.html` — the Health Sync screen now has a native-only "Apple Health"
  card (JS: `connectAppleHealth()`, `readTodayStepsFromHealthKit()`,
  `syncWorkoutToHealthKit()`), gated behind the existing `isNativeApp()`
  helper. On the web/PWA build these functions are no-ops (`getHealthPlugin()`
  returns `null` because `window.Capacitor.Plugins.Health` doesn't exist
  there), so nothing changes or breaks for web users — the manual JSON/CSV
  export/import stays as-is.
- Finishing a workout now calls `syncWorkoutToHealthKit(durationMinutes, calories)`,
  which writes a `calisthenics`-type workout sample plus an active-calories
  sample to HealthKit, once permission has been granted.
- Health Sync screen copy rewritten in all 4 languages (he/en/nl/es) to
  honestly state: iOS now syncs steps + workouts automatically once you
  approve permission; Android has **no** equivalent yet (Google Health
  Connect would be a separate future project) — manual export/import remains
  the Android/web path.

## What you (the owner) need to do tomorrow in Xcode

1. **Install the new dependency.** From `capacitor-app/`:
   ```bash
   npm install
   npx cap sync ios
   ```
   `cap sync` will run `pod install` for you and copy `www/` (built from
   `index.html`) into the iOS project.

2. **Enable the HealthKit capability in Xcode.** Open
   `capacitor-app/ios/App/App.xcworkspace`, select the `App` target →
   **Signing & Capabilities** → **+ Capability** → add **HealthKit**. This
   step needs a live Apple Developer account session and cannot be done
   from a code-only session — Xcode auto-manages the entitlement file's
   binding to your provisioning profile once you do this. The
   `App.entitlements` file with the correct key is already in place; this
   step is what tells your provisioning profile to actually grant the
   capability.

3. **Confirm the entitlements file is still wired up.** After adding the
   capability, check that Xcode has kept (not replaced/renamed)
   `App/App.entitlements` and that the target's Build Settings still show
   `Code Signing Entitlements = App/App.entitlements` for both Debug and
   Release. Xcode sometimes regenerates this file when you toggle a
   capability — if it does, just confirm `com.apple.developer.healthkit` is
   still `true` in whatever it produces.

4. **Test on a real device, not the simulator.** The iOS Simulator does
   have a Health app, but it has no real step/motion data and workout
   syncing from third-party apps is unreliable there — Apple's own guidance
   is to test HealthKit reads/writes on a physical iPhone. Build a
   TestFlight-style device build and:
   - Tap "Connect Apple Health" on the Health Sync screen, approve the
     permission dialog.
   - Confirm today's step count appears.
   - Finish a workout in the app, then open Apple Health → Browse →
     Activity → Workouts and confirm a "Calisthenics" (or similar) entry
     appears with the right duration.

5. **Optional, not required for this PR:** Android has no Health Connect
   integration yet. `@capgo/capacitor-health` supports both HealthKit and
   Health Connect with a unified API, so wiring up Android later is
   possible without switching plugins — but it needs its own Info.plist
   equivalent (AndroidManifest permissions), a Health Connect privacy
   policy page, and testing on Android 8+, so it was left out of this pass
   to keep this a real, tested iOS delivery rather than a half-done
   cross-platform one.

## Known limitations, stated plainly

- Workout writes use the `calisthenics` `WorkoutType` bucket the plugin
  exposes — HealthKit will show them as workouts, but there is no
  bodyweight-specific exercise type distinct from "Calisthenics" to pick
  from.
- Calorie estimates are the same rough MET-based estimate already used
  elsewhere in the app (`estimateWorkoutCalories()`), not a HealthKit-derived
  or heart-rate-derived number — call it "estimated," not "measured."
- Reading steps only reads *today's* total on-demand when the Health Sync
  screen is opened or after connecting; there's no background sync yet.
