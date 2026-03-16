## Richi AI — React Native Knowledge Base (Consumer-Pro Compatible) v1.0

**Codename:** One Language. Three Surfaces. Contracts as Spine.

**Version:** 1.0
**Status:** ACTIVE

**Purpose:** Define how to build and maintain a React Native mobile client (iOS + Android) using Expo that integrates with a Consumer-Pro compliant backend/web app running on Vercel + Supabase Cloud (React/TypeScript). Designed for the dual-repo strategy where web and mobile are separate repositories sharing contracts via the orchestrator.

**Audience:** Solo builders and small teams already using React + TypeScript for web.

---

## Table of Contents

```
00 — Why React Native? (Context & Decision)
01 — Core Invariants (Never Break These)
02 — Architecture Doctrine (React Native)
03 — Repository & Folder Blueprint
04 — Dual-Repo Sharing Strategy
05 — Contracts, DTOs & Error Envelope
06 — Supabase + Edge Functions Client Patterns
07 — State Management & UI Composition
08 — Navigation
09 — Styling (NativeWind / Tailwind)
10 — Internationalization (i18n) Standards
11 — Offline Strategy (Decision Tree → Default Offline-Light)
12 — Security & Privacy
13 — Observability-Light
14 — Performance Targets (Mobile)
15 — Testing (Pragmatic Suite)
16 — CI/CD-Lite (Expo EAS)
17 — App Store & Monetization (Ads / IAP)
18 — Multi-Repo Compatibility Rules
19 — Appendices (Checklists & Templates)
```

---

## 00 — Why React Native? (Context & Decision)

### Decision rationale

The Richi AI Consumer-Pro stack is React + TypeScript + Vite + Tailwind + Supabase + Zod. React Native with Expo is the natural mobile choice because:

- **Same language and type system** — TypeScript everywhere, no Dart onboarding
- **Shared business logic** — Zod schemas, error envelope, API client, hooks, and types run on both web and mobile without modification
- **Shared tooling** — ESLint, Prettier, Vitest (for shared packages), same package ecosystem
- **Expo is production-ready** — New Architecture enabled by default since Expo SDK 53 (May 2025), EAS Build handles signing and distribution
- **NativeWind** — Tailwind-style classes in React Native, familiar mental model

### When Flutter is still the better choice

- Animation-heavy or graphics-intensive apps (games, custom rendering engines)
- Pixel-perfect custom design systems where native OS look is unwanted
- Team has existing Flutter/Dart expertise and no React investment

See `.claude/ref/mobile/flutter-kb.md` (deprecated but retained for reference).

---

## 01 — Core Invariants (Never Break These)

- **ContractsAsLaw**
  - Requests/responses/events follow shared contracts from the orchestrator.
  - No raw `any` or untyped API responses passed to UI.

- **SingleErrorModel**
  - Every backend failure maps to one client failure shape: `code`, `message`, optional `details`, optional `traceId`.

- **ResultEverywhere**
  - Services return `Result<T>`, never throw raw exceptions to UI.

- **SingleLoggerFacade**
  - One logger interface for the entire app.
  - No uncontrolled `console.log` in features.

- **FeatureFirst**
  - New functionality lives under `src/features/<feature>/...`.

- **SharedContractsFromOrchestrator**
  - Contracts, types, and error envelope come from the shared package distributed by the orchestrator. Never duplicate locally.

- **i18nNonOptional**
  - Every user-visible string is an i18n key.

- **OfflineIsADecision**
  - Default for content-dependent apps: Offline-Light (banner + retry), no full sync.

- **NoSecretsInRepo**
  - `.env` is local; CI secrets are in EAS Secrets.
  - Never commit tokens, keys, or signing material.

- **EnglishOnlyCodePolicy**
  - Code identifiers and comments are English only.
  - User-facing strings are localized via i18n.

---

## 02 — Architecture Doctrine (React Native)

### Goal

A pragmatic, feature-first architecture that mirrors the web app's structure as closely as possible, maximizing familiarity and code portability.

### Practical layering

- **UI (`ui/`)**
  - Screens and components.
  - Renders state.
  - No direct API calls.

- **Hooks (`hooks/`)**
  - TanStack Query queries/mutations.
  - Orchestrates service calls.
  - Owns UI state (loading/error/empty/success).

- **Service (`service/`)**
  - Supabase/Edge Function calls.
  - Error normalization into `Result<T>`.

- **Model (`model/`)**
  - Feature-specific types (extends shared contracts where needed).

- **Shared (`src/shared/`)**
  - Design system atoms/molecules (NativeWind-styled).

- **Lib (`src/lib/`)**
  - Config, logger, metrics, Supabase client instance.

> The web app uses `features/[feature]/{ui,service,model}`. Mobile mirrors this with the addition of `hooks/` for TanStack Query integration.

---

## 03 — Repository & Folder Blueprint

```
project-app.richi.solutions/
  src/
    app/                    # Expo Router layout files
      _layout.tsx
      (tabs)/
        _layout.tsx
        index.tsx
        explore.tsx
        profile.tsx
      [feature]/
        index.tsx
        [id].tsx

    features/
      [feature]/
        ui/                 # Screens, components
        hooks/              # TanStack Query hooks
        service/            # API calls → Result<T>
        model/              # Feature-specific types

    shared/
      ui/                   # Design system components
        atoms/
        molecules/
      hooks/                # Shared hooks (useAuth, useOnlineStatus)

    lib/
      supabase.ts           # Supabase client instance
      config.ts             # Typed config loader
      logger.ts             # Logger facade
      result.ts             # Result type (from shared contracts)
      api-client.ts         # Edge Function caller

    contracts/              # Synced from orchestrator (read-only)
      v1/

    i18n/
      config.ts
      locales/
        en.json
        de.json

  app.json                  # Expo config
  eas.json                  # EAS Build config
  tailwind.config.ts        # NativeWind / Tailwind config
  tsconfig.json
  package.json
```

### Dependency rules

- `features/*` may import `shared/*`, `lib/*`, and `contracts/*`.
- `shared/*` may import `lib/*` and `contracts/*` but never `features/*`.
- `lib/*` may import `contracts/*` but never `features/*` or `shared/*`.
- `contracts/*` is read-only — synced from orchestrator.

---

## 04 — Dual-Repo Sharing Strategy

### What is shared

| Asset | Source of Truth | Distribution |
|-------|----------------|--------------|
| Zod schemas / contracts | `orchestrator.richi.solutions/packages/contracts/` | Sync workflow or Git Subtree |
| Error envelope (`Result<T>`) | Same package | Same mechanism |
| TypeScript types | Generated from Zod schemas | Same mechanism |
| `.claude/` rules & skills | `orchestrator.richi.solutions/.claude/` | `sync-dotclaude.yml` (existing) |

### What is NOT shared (platform-specific)

| Asset | Lives in |
|-------|----------|
| React components (DOM) | Web repo only |
| React Native components | Mobile repo only |
| Expo Router config | Mobile repo only |
| React Router config | Web repo only |
| NativeWind styles | Mobile repo only |
| Tailwind CSS styles | Web repo only |
| Supabase client instance | Each repo (same `@supabase/supabase-js`, different config) |

### Sync mechanism

Same pattern as `.claude/` distribution:

```yaml
# In orchestrator: .github/workflows/sync-contracts.yml
# Distributes packages/contracts/ to all project repos
# Target: src/contracts/ (read-only in target repos)
```

Alternatively, use Git Subtree:

```bash
# In mobile repo — pull contracts from orchestrator
git subtree pull --prefix=src/contracts \
  git@github.com:richi-solutions/orchestrator.richi.solutions.git \
  main --squash
```

### Version parity rule

When a contract changes:
1. Update in orchestrator
2. Sync runs (or manual pull)
3. Both web and mobile repos receive the same contract version
4. CI catches type errors if implementations are out of sync

---

## 05 — Contracts, DTOs & Error Envelope

### Contracts (source of truth)

- The orchestrator owns canonical contracts (Zod schemas).
- Mobile imports them directly as TypeScript — no code generation needed.
- Same `z.infer<typeof Schema>` types on web and mobile.

### Result / error envelope

```typescript
// From shared contracts package
export interface Result<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  traceId?: string;
}

export const success = <T>(data: T): Result<T> => ({ ok: true, data });
export const failure = (code: string, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
```

This is the **same code** used in the web app. No duplication.

---

## 06 — Supabase + Edge Functions Client Patterns

### Client setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // No URL handling on mobile
    },
  }
);
```

### Edge Function calls

```typescript
// src/lib/api-client.ts
import { supabase } from './supabase';
import { failure, type Result } from '../contracts/v1/result';
import { logger } from './logger';

export const callEdgeFunction = async <T>(
  name: string,
  body: unknown,
  requestId?: string,
): Promise<Result<T>> => {
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body: JSON.stringify(body),
    });

    if (error) {
      logger.error('edge_function_error', error, { function: name, requestId });
      return failure('UPSTREAM_UNAVAILABLE', error.message);
    }

    return data as Result<T>;
  } catch (err) {
    logger.error('edge_function_exception', err, { function: name, requestId });
    return failure('INTERNAL_ERROR', 'Unexpected error');
  }
};
```

### Reliability patterns

Same as web:
- **Retry** only for timeouts and 5xx errors
- **Do not retry** 4xx or 429 — show friendly UI + retry button
- **TanStack Query** handles caching, deduplication, and background refetch

---

## 07 — State Management & UI Composition

### Standard: TanStack Query + Zustand

| Concern | Tool |
|---------|------|
| Server state (API data) | TanStack Query (`@tanstack/react-query`) |
| Client state (UI, preferences) | Zustand (or React Context for simple cases) |
| Forms | React Hook Form + Zod resolver |

### TanStack Query pattern

```typescript
// src/features/[feature]/hooks/useFeatureList.ts
import { useQuery } from '@tanstack/react-query';
import { featureService } from '../service/featureService';

export const useFeatureList = (userId: string) => {
  return useQuery({
    queryKey: ['features', userId],
    queryFn: () => featureService.getList(userId),
    staleTime: 5 * 60 * 1000, // 5 min
  });
};
```

### UI states

Every screen must support:
- **Loading** — Skeleton loaders (not spinners)
- **Error** — Message + retry button
- **Empty** — Illustration + call-to-action
- **Success** — Data rendered

---

## 08 — Navigation

### Standard: Expo Router (file-based)

```
src/app/
  _layout.tsx              # Root layout (providers, fonts, splash)
  (tabs)/
    _layout.tsx            # Tab navigator
    index.tsx              # Home tab
    explore.tsx            # Explore tab
    profile.tsx            # Profile tab
  (auth)/
    _layout.tsx            # Auth stack
    login.tsx
    register.tsx
  [feature]/
    index.tsx              # Feature list
    [id].tsx               # Feature detail
```

### Deep linking

Expo Router provides deep linking by default. Configure in `app.json`:

```json
{
  "expo": {
    "scheme": "projectname",
    "web": {
      "bundler": "metro"
    }
  }
}
```

---

## 09 — Styling (NativeWind / Tailwind)

### Standard: NativeWind v4

NativeWind brings Tailwind CSS classes to React Native. Familiar syntax for teams using Tailwind on web.

```tsx
import { View, Text } from 'react-native';

export const Card = ({ title, subtitle }: CardProps) => (
  <View className="bg-white rounded-2xl p-4 shadow-sm">
    <Text className="text-lg font-semibold text-gray-900">{title}</Text>
    <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>
  </View>
);
```

### Design tokens

Share color palette and spacing scale between web (`tailwind.config.ts`) and mobile (`tailwind.config.ts`). Both reference the same design token values.

```typescript
// tailwind.config.ts (mobile)
export default {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Same brand colors as web
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
      },
    },
  },
};
```

### Component library

Use `react-native-reusables` (rnr) as the shadcn/ui equivalent for React Native. Same mental model: copy-paste components, full ownership, NativeWind-styled.

### What NOT to share

DOM-based shadcn/ui components (Radix primitives) do not run in React Native. Each platform owns its UI component library. Only design tokens (colors, spacing, typography scale) are shared.

---

## 10 — Internationalization (i18n) Standards

### Standard: i18next + react-i18next (same as web)

```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import de from './locales/de.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: Localization.getLocales()[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### Key parity with web

Use the same i18n key structure as the web app. Not all keys will exist on both platforms, but shared keys (auth, errors, common) must use identical names.

```json
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "auth": { "login": "Log in", "logout": "Log out" },
  "errors": { "network": "Network error. Please try again." }
}
```

---

## 11 — Offline Strategy (Decision Tree → Default Offline-Light)

### Default for content-dependent apps

**Offline-Light:**

- Offline banner / error state via `@react-native-community/netinfo`
- Retry button
- TanStack Query provides stale cache while offline
- No offline write queue
- No full local sync

### Full offline mode (only if)

- Core workflow is user data entry/creation
- Conflict resolution is defined and tested
- Use TanStack Query persistence (`@tanstack/query-async-storage-persister`)

---

## 12 — Security & Privacy

- HTTPS only (Supabase enforces this).
- Store auth tokens in `expo-secure-store` (Keychain/Keystore).
- Never log tokens or raw PII.
- Backend enforces auth/RLS; client assumes nothing beyond its tokens.
- No API keys in source code — use Expo environment variables (`app.config.ts`).
- Use `expo-local-authentication` for biometric lock (optional, not default).

---

## 13 — Observability-Light

### Default

- Global error boundary (`ErrorBoundary` component at root).
- Logger facade with structured context:
  - feature, endpoint, status, traceId
- `console.error` in development, structured JSON in production.

```typescript
// src/lib/logger.ts
export const logger = {
  info: (event: string, data?: Record<string, unknown>) => {
    if (__DEV__) console.log(`[INFO] ${event}`, data);
  },
  error: (event: string, error: unknown, data?: Record<string, unknown>) => {
    if (__DEV__) console.error(`[ERROR] ${event}`, error, data);
    // Future: Sentry.captureException(error);
  },
  warn: (event: string, data?: Record<string, unknown>) => {
    if (__DEV__) console.warn(`[WARN] ${event}`, data);
  },
};
```

### Optional later

- Add Sentry (`@sentry/react-native`) when crash reporting ROI is clear.
- Add analytics via `expo-analytics` or custom event tracking.

---

## 14 — Performance Targets (Mobile)

| Metric | Target |
|--------|--------|
| Cold start | < 2s (splash to interactive) |
| List scroll | 60 fps sustained |
| Navigation | < 300ms transition |
| Memory | < 200 MB active usage |
| Bundle size | < 50 MB (OTA update payload) |

### Key practices

- Use `FlashList` instead of `FlatList` for large lists.
- Lazy-load screens via Expo Router (automatic with file-based routing).
- Use `react-native-fast-image` for image caching.
- Avoid heavy computation on JS thread — use `InteractionManager` or workers.
- Use Hermes engine (default in Expo SDK 53+).

---

## 15 — Testing (Pragmatic Suite)

### Minimum baseline

- `npx jest` passes.
- One smoke test (app renders root layout).
- Unit tests for shared utilities (result, logger, config).

### Critical flows (recommended)

- Auth → Home
- Main feature list → Detail
- User action (add/remove/rate)
- Error state + retry

### Testing tools

| Layer | Tool |
|-------|------|
| Unit | Jest + `@testing-library/react-native` |
| Component | `@testing-library/react-native` |
| E2E | Maestro (recommended) or Detox |
| Contract | Zod schema validation (shared with web) |

### Test structure

```typescript
// src/features/[feature]/__tests__/featureService.test.ts
describe('featureService', () => {
  it('returns Result.ok on success', async () => {
    const result = await featureService.getById('123');
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('returns Result.error on network failure', async () => {
    // Mock supabase to throw
    const result = await featureService.getById('invalid');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
```

---

## 16 — CI/CD-Lite (Expo EAS)

### Build & Submit

```json
// eas.json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

### CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
```

### EAS Build (triggered separately)

```bash
# Preview build (for internal testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform all
```

### OTA Updates

Use EAS Update for JS-only changes (no native module changes):

```bash
eas update --branch production --message "fix: resolve list rendering issue"
```

---

## 17 — App Store & Monetization (Ads / IAP)

### Google AdMob (React Native)

Use `react-native-google-mobile-ads` package.

#### Consent (UMP) flow

Same principles as Flutter KB Section 14:

1. Check consent status on first app open
2. Show UMP consent form if required (GDPR/EEA)
3. Initialize ads only after consent resolution
4. Provide re-consent option in Settings

```typescript
// src/lib/ads.ts
import mobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

export const initAdsWithConsent = async (): Promise<void> => {
  const consentInfo = await AdsConsent.requestInfoUpdate();

  if (consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED) {
    await AdsConsent.showForm();
  }

  await mobileAds().initialize();
};
```

### In-App Purchases (optional)

Use `react-native-purchases` (RevenueCat) or `expo-in-app-purchases` when monetization via IAP is needed.

---

## 18 — Multi-Repo Compatibility Rules

- Web (Vercel + Supabase Cloud) lives in `project.richi.solutions`
- Mobile (Expo + Supabase Cloud) lives in `project-app.richi.solutions`
- Both repos point to the same Supabase project (same DB, Auth, Edge Functions)
- Compatibility is maintained via:
  - Shared contracts from orchestrator (synced, not duplicated)
  - Same error envelope standard
  - Same i18n key structure for shared keys
  - Same Supabase client library (`@supabase/supabase-js`)

### Environment separation

| Environment | Supabase Project | Mobile Build |
|-------------|------------------|--------------|
| Development | Local (`supabase start`) | Expo Dev Client |
| Preview | Staging project | EAS Preview build |
| Production | Production project | EAS Production build |

---

## 19 — Appendices (Checklists & Templates)

### A) New Feature Checklist

- [ ] Create `features/<feature>/{ui,hooks,service,model}`
- [ ] Add i18n keys for all UI strings
- [ ] Service returns `Result<T>` only
- [ ] Hook uses TanStack Query with proper `queryKey`
- [ ] UI has Loading (skeleton) + Error (retry) + Empty (CTA) + Success
- [ ] Logs include feature/service context

### B) New Edge Function Integration Checklist

- [ ] Contract exists in orchestrator's shared contracts
- [ ] Service calls `callEdgeFunction` and returns `Result<T>`
- [ ] Error envelope mapped correctly
- [ ] 429 handled with friendly UI + retry button
- [ ] Tests for service mapping and error cases

### C) Release Readiness Checklist (Mobile)

- [ ] Environment variables configured in EAS Secrets
- [ ] `npm run test` green
- [ ] `npm run lint` clean
- [ ] `npm run typecheck` clean
- [ ] `eas build` succeeds for both platforms
- [ ] Deep links tested
- [ ] Offline banner tested
- [ ] Consent flow tested (GDPR regions)

### D) New Project Setup

```bash
# 1. Create Expo project
npx create-expo-app project-app --template tabs

# 2. Add core dependencies
npx expo install expo-secure-store expo-localization @react-native-community/netinfo
npm install @supabase/supabase-js @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
npm install nativewind tailwindcss
npm install -D @testing-library/react-native jest

# 3. Configure EAS
eas init
eas build:configure

# 4. Sync contracts from orchestrator
# (via workflow or git subtree — see Section 04)

# 5. Copy i18n keys from web repo (shared subset)
```

---

## Changelog

### v1.0 (2026-03-16)

- Initial React Native Knowledge Base
- Based on Consumer-Pro KB v3.2 principles
- Designed for dual-repo strategy with shared contracts via orchestrator
- Replaces Flutter KB as default mobile recommendation
- Expo SDK 53+ with New Architecture as baseline
- NativeWind v4 for Tailwind-style styling
- TanStack Query + Zustand for state management
- Expo Router for file-based navigation
