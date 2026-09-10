# Firebase Authentication setup (do this at the office)

The app's sign-in screen (phone SMS code + email link) is fully built, but it
needs a real Firebase project before it will work. This is **identity
verification only** — no user data is uploaded anywhere; workouts, profile,
history etc. all stay on-device exactly as before.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com → **Add project** → give it a
   name (e.g. "Calisthenics Journey") → follow the wizard (Google Analytics
   is optional, skip it if you don't want it).
2. Inside the project, click **Build → Authentication → Get started**.
3. Under **Sign-in method**, enable:
   - **Phone** — no extra account needed, Firebase sends the SMS itself.
   - **Email link (passwordless sign-in)** — under the **Email/Password**
     provider, toggle "Email link (passwordless sign-in)" on.

## 2. Register a Web app and get the config
1. In Project Settings (gear icon) → **General** → scroll to "Your apps" →
   click the **</>** (Web) icon → register an app (any nickname).
2. Firebase shows a `firebaseConfig` object like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```
3. Copy those exact values into `index.html` — search for `firebaseConfig`
   (in the `<script>` block, near `function login`) and replace the
   `"REPLACE_ME"` placeholders. These values are **not secret** — they're
   meant to be public in client code; Firebase Security Rules (not this
   config) are what actually protect data.
4. After editing, re-run the same resync step used for every other
   `index.html` change: copy the file into `app-store-prep/capacitor-app/www/`,
   `.../ios/App/App/public/`, and `.../android/app/src/main/assets/public/`,
   then rebuild the zip (or just copy the one edited file into the already-
   unzipped Xcode project directly, whichever is faster in the moment).

## 3. iOS-specific setup (needed for phone SMS to work in the native app)
1. In Firebase Console → Project Settings → **Your apps** → also add an
   **iOS app** using the same bundle ID as the Capacitor app
   (`com.calisthenicsjourney.app`, from `capacitor.config.ts`).
2. Download the generated **`GoogleService-Info.plist`** and drag it into
   the Xcode project (`ios/App/App/`), added to the `App` target.
3. Under Firebase Console → Project Settings → **Cloud Messaging** →
   **Apple app configuration**, upload an APNs authentication key (create
   one in your Apple Developer account under **Certificates, IDs & Profiles
   → Keys** if you don't have one) — this lets Firebase silently verify the
   app instead of showing a reCAPTCHA challenge for phone sign-in.
4. In Xcode, add the **Push Notifications** and **Background Modes →
   Remote notifications** capabilities to the App target (Signing &
   Capabilities tab) — Firebase Phone Auth uses silent push for
   verification on real devices.

## 4. Email link caveat (native app)
Email sign-in sends a clickable link, not a typed code (Firebase doesn't
support "6-digit code by email" natively — only phone does). For the link
to reopen this native app instead of just opening in Safari, it needs
**Firebase Dynamic Links** or an **Associated Domain** configured for the
app — that's an extra setup step in both the Firebase Console and Xcode's
Signing & Capabilities. Until that's wired up, tapping the email link will
open the sign-in page in Safari instead of the app; phone sign-in doesn't
have this limitation and is the more turnkey option for the native app.

## 5. Test
- **Web/PWA build** (GitHub Pages/Vercel): both phone and email link work
  as soon as step 1-2 are done — no native/Xcode work needed for the web
  version.
- **Native iOS app**: phone sign-in needs step 3; email link needs step 4
  on top of that.
