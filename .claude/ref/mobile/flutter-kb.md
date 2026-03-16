## Richi AI — Flutter Knowledge Base (Consumer‑Pro Compatible) v2.0

**Status:** DEPRECATED (2026-03-16) — Superseded by `react-native-kb.md`

> **Migration note:** React Native with Expo is now the default mobile recommendation
> for Consumer-Pro projects. The React + TypeScript stack enables direct code sharing
> (contracts, hooks, API client) between web and mobile. See `react-native-kb.md`.
>
> This document is retained for reference in case a project uses Flutter.

**Codename:** One Codebase. Two Platforms. Contracts as Spine.

**Version:** 2.0

**Purpose:** Define how to build and maintain a Flutter mobile client (iOS + Android from one codebase) that cleanly integrates with a Consumer‑Pro compliant backend/web app running on Vercel + Supabase Cloud (React/TypeScript).

**Audience:** Solo builders and small teams.

---

## Table of Contents

```
00 — What is Consumer‑Pro? (Context & Philosophy)
01 — Core Invariants (Never Break These)
02 — Architecture Doctrine (Flutter)
03 — Repository & Folder Blueprint (Standard)
04 — Contracts, DTOs & Error Envelope
05 — Supabase + Edge Functions Client Patterns
06 — State Management & UI Composition
07 — Internationalization (i18n) Standards
08 — Offline Strategy (Decision Tree → Default Offline‑Light)
09 — Security & Privacy
10 — Observability‑Light (Default: No 3rd Parties)
11 — Performance Targets (Mobile)
12 — Testing (Pragmatic Suite)
13 — CI/CD‑Lite (Android + iOS)
14 — Google AdMob + Consent (UMP) Integration (Android + iOS)
15 — Multi‑Repo Compatibility Rules (Web + Backend + Mobile)
16 — Migration Notes (v1.0 → v2.0)
17 — Appendices (Checklists & Templates)
```

---

## 00 — What is Consumer‑Pro? (Context & Philosophy)

**Consumer‑Pro** is Richi AI’s pragmatic “middle ground” between MVP speed and SaaS discipline.

It is a framework‑agnostic set of rules and patterns for consumer applications that must ship fast, remain maintainable, and evolve without rewrites.

### Why Consumer‑Pro exists

- **Ship features fast** without creating architectural debt.
- **Keep contracts stable** so multi‑platform clients (Web + Mobile) do not break.
- **Support multi‑platform** from day one (Web, Mobile, Backend).
- **Make i18n non‑optional** for consumer products.

### What “Consumer‑Pro compliant” means in practice

- **Contracts as Law**: APIs/events are typed, validated, versioned, and treated as trust boundaries.
- **Error Envelope Standard**: failures are returned consistently (e.g., `{ ok, data?, error?, traceId? }`).
- **Ports & Adapters mindset**: external I/O is isolated behind clear boundaries.
- **Observability‑Light**: enough visibility to debug and operate confidently (especially as a solo builder).
- **Offline strategy is pragmatic**: offline mode is chosen only when it provides real user value.

### Flutter’s role in a Consumer‑Pro system

The Flutter app is a **client surface**:

- It orchestrates calls, manages UX, handles caching where useful, and provides a native mobile experience.
- It does **not** own authoritative business rules (those live server‑side).
- It respects Consumer‑Pro contracts, error envelopes, i18n rules, and privacy/security constraints.

---

## 01 — Core Invariants (Never Break These)

- **ContractsAsLaw**
  - Requests/responses/events follow defined contracts.
  - Avoid passing `Map<String, dynamic>` into UI.

- **SingleErrorModel**
  - Every backend failure maps to one client failure shape: `code`, `message`, optional `details`, optional `traceId`.

- **ResultEverywhere**
  - Services return a single `Result<T>` model (or equivalent), never throw raw exceptions to UI.

- **SingleLoggerFacade**
  - One logger interface for the entire app.
  - No uncontrolled `print()` usage in features.

- **FeatureFirst**
  - New functionality lives under `lib/features/<feature>/...`.

- **CoreOwnsCrossCutting**
  - Env/config, logging, error/result, caching, retry/dedup live under `lib/core/*`.

- **i18nNonOptional**
  - Every user‑visible string is an i18n key.

- **OfflineIsADecision**
  - Default for content‑dependent apps: Offline‑Light (banner + retry), no full sync.

- **NoSecretsInRepo**
  - `.env` is local; CI secrets are remote.
  - Never commit tokens, keys, or signing material.

- **EnglishOnlyCodePolicy**
  - Code identifiers and comments are English only.
  - User‑facing strings are localized via i18n.

---

## 02 — Architecture Doctrine (Flutter)

### Goal

A pragmatic, scalable architecture that matches how our real Flutter apps are built (e.g., MovieMind):

- Feature‑first slices
- Strong core utilities
- Clear boundaries between UI, state, and service logic

### Practical layering

- **UI (`ui/`)**
  - Widgets and screens.
  - Renders state.
  - No network calls.

- **State (`state/`)**
  - Riverpod providers/notifiers.
  - Orchestrates service calls.
  - Owns UI state (loading/error/empty/success).

- **Service (`service/`)**
  - Supabase/Edge Function calls.
  - Mapping to DTOs.
  - Error normalization into `Result<T>`.

- **Core (`core/`)**
  - `Result`, error, logger, env, request deduplication, caching, localization helpers.

- **Shared UI (`shared/ui/`)**
  - Design system atoms/molecules/widgets.

> “Ports & Adapters” is a mindset. Introduce explicit ports/adapters only when you truly need swappable infrastructure.

---

## 03 — Repository & Folder Blueprint (Standard)

This blueprint matches the current structure in this repository.

```
lib/
  main.dart

  app/
    app.dart
    router.dart
    providers.dart
    theme/

  core/
    api/
      edge_functions_service.dart
    infrastructure/
      cache_service.dart
    localization/
      language_service.dart
      region_detector.dart
      genre_translations.dart
      regions.dart

    env.dart
    logger.dart
    result.dart
    error.dart
    request_deduplicator.dart
    debouncer.dart
    ...

  shared/
    ui/
      atoms/
      molecules/
      widgets/

  features/
    <feature>/
      ui/
      state/
      service/
      model/
      validators/ (optional)

  presentation/
    navigation/ (legacy bucket; avoid adding new code here)
```

### Dependency rules

- `features/*` may import `core/*` and `shared/*`.
- `shared/*` may import `core/*` but must never import `features/*`.
- `core/*` must never import `features/*`.

---

## 04 — Contracts, DTOs & Error Envelope

### Contracts (source of truth)

- Consumer‑Pro web/backend owns canonical contracts (OpenAPI/JSON Schema/event schemas).
- Mobile must treat those contracts as trust boundaries and keep backward compatibility.

### DTO rules

- UI never consumes raw JSON maps.
- Use generated models (e.g., `freezed` + `json_serializable`) to avoid inconsistent parsing.

### Result / error envelope mapping

- Map backend errors into a single `Result<T>` failure shape:
  - `code`: stable error identifier (e.g., `RATE_LIMIT`, `UNAUTHORIZED`, `INTERNAL_ERROR`)
  - `message`: user‑safe message
  - `details`: optional, technical
  - `traceId`: optional correlation id

---

## 05 — Supabase + Edge Functions Client Patterns

### API gateway pattern

- Keep a single edge gateway service under `core/api/edge_functions_service.dart`.
- Feature services call the gateway and return `Result<T>`.

### Reliability patterns

- **Deduplicate** identical requests when possible (especially expensive AI calls).
- **Retry** only for:
  - timeouts / network errors
  - transient server errors (5xx)
- **Do not retry**:
  - client errors (4xx)
  - rate limits (429) → show friendly UX + retry button

### TraceId correlation

- If backend returns a trace/request id, propagate it into logs and `Result.failure(...traceId)`.

---

## 06 — State Management & UI Composition

### Standard: Riverpod

- Services are exposed via providers in `app/providers.dart`.
- Features own their state in `features/<feature>/state/*`.

### UI states

Every core screen should support:

- Loading
- Error (with retry)
- Empty (with clear next step)
- Success

---

## 07 — Internationalization (i18n) Standards

### Rules

- Every user‑visible string is an i18n key.
- Key grouping convention:
  - `common.*`, `auth.*`, `profile.*`, `errors.*`, `discovery.*`, `movieDetail.*`, ...
- Keep keys stable.

### Locale + region

- Pre‑login locale/region setup is allowed (to localize onboarding/auth).
- After login, sync preferred language/region into the user profile.

---

## 08 — Offline Strategy (Decision Tree → Default Offline‑Light)

### Default for content‑dependent apps

**Offline‑Light**:

- Offline banner / error state
- Retry button
- No offline write queue
- No full local sync
- No “download posters for offline usage” feature

### Full offline mode (only if)

- The core workflow is user data entry/creation, and
- Conflict resolution is defined and tested.

---

## 09 — Security & Privacy

- HTTPS only.
- Store tokens in secure storage (Keychain/Keystore via plugin).
- Never log tokens or raw PII.
- Backend enforces auth/RLS; client assumes nothing beyond its tokens.

---

## 10 — Observability‑Light (Default: No 3rd Parties)

### Default (solo builder friendly)

- Global error capturing (zoned error handler + Flutter error handler).
- Logger facade with structured context:
  - feature
  - endpoint
  - status
  - traceId
- Breadcrumb buffer for recent actions.

### Optional later

- Add Sentry/OTel only when ROI is clear.

---

## 11 — Performance Targets (Mobile)

- Avoid heavy work on the main isolate.
- Use pagination/infinite scroll for large lists.
- Use image caching with memory constraints for posters.
- Deduplicate identical requests and cache expensive detail calls.

---

## 12 — Testing (Pragmatic Suite)

### Minimum baseline

- `flutter test` passes.
- One widget smoke test (app boots).
- Unit tests for core utilities (result/retry/dedup).

### Critical flows (recommended)

- Auth → Home
- Search → Detail
- Watchlist add/remove
- Rating flow

---

## 13 — CI/CD‑Lite (Android + iOS)

- `flutter analyze`
- `flutter test`
- Build Android (AAB) for internal testing track.
- Build iOS (IPA) for TestFlight (macOS runner required).
- Store signing credentials in CI secrets.

---

## 14 — Google AdMob + Consent (UMP) Integration (Android + iOS)

This section describes a **Consumer‑Pro compatible** way to integrate ads while ensuring consent is requested **after download and first app open**, stored on device, and applied consistently.

### 14.1 — Principles

- Consent must be requested **before showing ads** in regions where required (e.g., GDPR/EEA).
- Consent status must be persisted on device.
- Users must be able to change consent later (recommended via a “Privacy / Ads” settings entry).
- Do not log PII or advertising identifiers.

### 14.2 — Recommended approach

Use:

- **`google_mobile_ads`** (Flutter) for serving AdMob ads.
- **Google UMP (User Messaging Platform)** to handle consent.
  - UMP stores consent internally.
  - Additionally store a lightweight local flag (e.g., `consent_prompt_seen`) to prevent repeated prompts and to control UX.

> Note: Consent is separate from Apple’s AppTrackingTransparency (ATT). ATT may still be required if you access IDFA.

### 14.3 — “First open after install” flow

On app startup:

1. Check if this is the first open (local flag in SharedPreferences).
2. If first open:
   - Request consent info from UMP.
   - If required, load and show the consent form.
   - Store local flags (e.g., `consent_prompt_seen = true`, `last_consent_status = ...`).
3. Initialize `MobileAds.instance.initialize()` only after consent is resolved (or if consent is not required).
4. Start showing ads.

### 14.4 — Local storage

Store in `SharedPreferences`:

- `consent_prompt_seen: bool`
- `consent_status: string` (optional mirror; UMP is still source of truth)
- `consent_last_updated_at: ISO string` (optional)

### 14.5 — Android integration checklist

1. Create an AdMob app in the AdMob console.
2. Add the AdMob **App ID** to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY" />
```

3. Add ad unit ids (banner/interstitial/rewarded) to your env/config.
4. Use test ad unit ids in debug builds.

### 14.6 — iOS integration checklist

1. Create the iOS app in AdMob.
2. Add the AdMob **App ID** to `ios/Runner/Info.plist`:

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
```

3. Ensure SKAdNetwork IDs configuration if required by your ad setup (follow Google guidance).

### 14.7 — Consent (UMP) implementation notes (Flutter)

**Pseudo-code outline (SDK names may vary by chosen plugin):**

```dart
/// Run this before showing any ads.
Future<void> initAdsWithConsent() async {
  final prefs = await SharedPreferences.getInstance();
  final hasSeenConsent = prefs.getBool('consent_prompt_seen') ?? false;

  // 1) Request consent info update (UMP)
  // final consentInfo = await UmpConsent.requestConsentInfoUpdate(...);

  // 2) If consent form is available and required, show it
  // if (consentInfo.isConsentFormAvailable && consentInfo.consentStatus == required) {
  //   await UmpConsent.loadAndShowConsentFormIfRequired();
  // }

  // 3) Mark that we attempted consent on first open
  if (!hasSeenConsent) {
    await prefs.setBool('consent_prompt_seen', true);
  }

  // 4) Initialize Mobile Ads only after consent resolution
  await MobileAds.instance.initialize();
}
```

### 14.8 — Where to place the code in this architecture

- **Consent/Ads orchestration** belongs in `core/infrastructure/` as a small service (e.g., `ads_consent_service.dart`).
- UI triggers should be in `app/app.dart` or an early “bootstrap” flow.
- Feature screens should not contain consent logic.

### 14.9 — Re-consent / Settings

Provide a Settings entry (e.g., Profile → Privacy/Ads):

- Re-open consent form (UMP supports showing the form again in many setups).
- Explain what ads personalization means.

---

## 15 — Multi‑Repo Compatibility Rules (Web + Backend + Mobile)

- Web/Backend (Vercel + Supabase Cloud) may live in a separate repo.
- Mobile (Flutter) may live in a separate repo.
- Compatibility is maintained via stable contracts and shared invariants:
  - contract discipline
  - error envelope mapping
  - i18n key parity where possible

---

## 16 — Migration Notes (v1.0 → v2.0)

Key changes from the old Flutter KB:

- Offline-first is not a default. We use a decision tree; for content apps we ship Offline‑Light.
- Strict `domain/ports/adapters` folder doctrine is replaced with pragmatic feature‑first aligned to our real codebase.
- English-only code naming/comments policy is enforced.
- i18n is a first-class, non-optional standard.

---

## 17 — Appendices (Checklists & Templates)

### A) New Feature Checklist

- [ ] Create `features/<feature>/{ui,state,service,model}`
- [ ] Add i18n keys for all UI strings
- [ ] Service returns `Result<T>` only
- [ ] UI has Loading + Error + Empty + Success
- [ ] Logs include feature/service context

### B) New Edge Function Integration Checklist

- [ ] Define request/response fields (contract doc)
- [ ] Implement DTOs + mapping
- [ ] Map error envelope into `Failure(code,message,details,traceId)`
- [ ] Handle 429 with friendly UI + retry option
- [ ] Add tests for mapping and critical paths

### C) Release Readiness Checklist (Mobile)

- [ ] `.env` present locally; CI secrets configured
- [ ] `flutter test` green
- [ ] `flutter analyze` has no errors/warnings (info-only is acceptable)
- [ ] Android signing configured
- [ ] iOS signing + provisioning configured
- [ ] Store-native crash reporting verified
```} 