# 🌍 Richi AI — Consumer-Pro Knowledge Base v3.2

**"Lean Today. Limitless Tomorrow."**

**Version 3.2** — React + Vite + Vercel + Supabase Cloud patterns for scalable consumer applications

---

## Table of Contents

```
00 — Purpose
01 — Core Invariants
02 — Architecture Doctrine
03 — Contracts & DTOs
04 — Consumer UX & Mobile Principles
05 — PWA & Offline-First (Decision Tree)
06 — Security & Privacy
07 — Observability-Light
08 — Pragmatic Testing
09 — CI/CD-Lite
10 — Event Schema
11 — Migration Playbook
12 — Delta Map
13 — Implementation Priority Matrix
14 — External Dependencies
15 — Performance Targets
16 — Multi-Platform Architecture
17 — Internationalization (i18n) Standards
18 — Documentation Standards
19 — Edge Function Patterns
20 — SEO Standards
21 — Summary
22 — Docs Execution System (Core / Generation / Growth / Runtime)
23 — Claude Code Integration & Deployment
```

---

## 00 — Purpose

**Consumer-Pro** defines the middle ground between **MVP speed** and **SaaS discipline**.
It enables small teams or solo founders to build consumer apps that scale gracefully — lean at start, strong at scale.

> Simplify execution without weakening structure.

### Goals

- Deliver features fast without architectural debt
- Maintain upgrade compatibility with the **Richi AI SaaS KB**
- Keep interfaces, contracts, and patterns stable — so the system can evolve without rewrites
- Support **multi-platform development** (Web, Mobile, Backend)
- Enable **internationalization** from day one

### What's New in v3.2

| Change | Rationale |
|--------|-----------|
| **Vercel** as frontend hosting | Production-grade deployment with Preview/Production environments |
| **Supabase Cloud** (self-provisioned) | Own projects at supabase.com instead of third-party managed |
| **Lovable** demoted to optional prototyping | No longer the deployment/hosting platform |
| `/migrate-from-lovable` skill | Automated migration path for Lovable prototypes |
| Deployment via Vercel Git Integration | Auto-deploy on PR (Preview) and merge to main (Production) |

Previous additions (v2.0): Multi-Platform Architecture, i18n Standards, Documentation Standards, Edge Function Patterns, SEO Standards, Offline Mode Decision Tree.

---

## 01 — Core Invariants (Never Break These)

- **Contracts as Law** – All APIs/events typed and validated via Zod/JSON Schema or OpenAPI
- **Ports & Adapters** – Isolate external I/O behind interfaces
- **Domain Purity** – Business logic has no side effects or I/O
- **Versioned Events** – Track app events via stable schemas, no PII
- **Typed Config Loader** – One validated entry point for all environment vars
- **Feature Flags Facade** – Wrap experimentation logic (`flags.get('x')`)
- **Logger & Metrics Facade** – Single interface for observability (Sentry now, OTel later)
- **Error Envelope Standard** – Every function returns `{ ok, data?, error? }`
- **English-Only Code Comments** – All code documentation in English for consistency
- **Platform-Agnostic Contracts** – Schemas work across Web, Mobile, Backend

> These invariants form the "spine" of your future SaaS evolution.

---

## 02 — Architecture Doctrine

### Folder Blueprint (Web Application)

```
src/
  pages/             # routes/pages (React Router)
  components/        # presentation only
  features/
    [feature-a]/     # e.g., products, articles, users
      ui/
      service/
      model/
    [feature-b]/
    [feature-c]/
  domain/            # pure use-cases, no I/O
  ports/             # interfaces (RepoPort, CachePort, etc.)
  adapters/          # concrete implementations (fetch, idb, http)
  lib/               # config, logger, metrics, flags, api client
  i18n/              # internationalization
    locales/
  contracts/         # API contracts (shared with backend)
    v1/
```

### Routing Pattern (React Router SPA)

**Default:** React Router with central route configuration. Deployed on Vercel as SPA.

```typescript
// src/App.tsx - Central route configuration
const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/explore", element: <Explore /> },
  { path: "/profile", element: <Profile /> },
]);
```

**Why React + Vite:**
- Fast development experience (HMR, instant builds)
- Simple SPA deployment on Vercel
- Mature ecosystem (React Router, TanStack Query, shadcn/ui)
- Compatible with rapid prototyping tools (e.g. Lovable) — no framework migration needed
- Backend logic via Supabase Edge Functions (no SSR needed)

### Folder Blueprint (Edge Functions)

```
supabase/functions/
  _shared/           # shared utilities
    edgeConfig.ts
    edgeLogger.ts
    edgeMetrics.ts
    edgeResult.ts
    rateLimit.ts
  [function-name]/
    index.ts
```

### Principles

- UI ≠ State ≠ Domain
- Adapters implement ports; domain only knows ports
- Fail fast, log meaningfully, recover gracefully
- Never cross layers directly
- Architect like a system that expects to grow
- **All code comments in English** — no exceptions

---

## 03 — Contracts & DTOs

All API endpoints must have:

1. Input schema (Zod/Valibot or JSON Schema)
2. Output schema

> Generate DTOs from schemas — never handwrite both.

### Contract Structure

```typescript
// src/contracts/v1/[resource].ts
import { z } from 'zod';

export const ResourceInputSchema = z.object({
  resourceId: z.string().uuid(),
  value: z.number().min(1).max(10),
  type: z.enum(['type_a', 'type_b']),
  note: z.string().max(500).optional(),
});

export const ResourceOutputSchema = z.object({
  id: z.string().uuid(),
  resourceId: z.string(),
  value: z.number(),
  createdAt: z.string().datetime(),
});

export type ResourceInput = z.infer<typeof ResourceInputSchema>;
export type ResourceOutput = z.infer<typeof ResourceOutputSchema>;
```

### Version APIs

All APIs versioned: `/v1/...`

### Error Format Standard

```typescript
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests"
  },
  "traceId": "req_abc123"
}
```

### OpenAPI Specification

Keep **OpenAPI spec** under `/docs/api.yaml`.

```yaml
# docs/api.yaml
openapi: 3.0.3
info:
  title: [App Name] API
  version: 1.0.0
paths:
  /v1/resources:
    post:
      summary: Create or update a resource
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResourceInput'
```

Interfaces define **trust boundaries**.

---

## 04 — Consumer UX & Mobile Principles

| Pattern | Description |
|---------|-------------|
| Skeleton Loaders | Show placeholder before data arrives |
| Optimistic Updates | Update UI immediately, rollback on failure |
| Pull-to-Refresh | Always available on mobile |
| Empty States | Teach the next action (e.g., "Add your first item") |
| Onboarding Flow | Deliver "First Recommendation" < 2 min |
| Gestures | Swipe to delete / save |
| Search & Discovery | Infinite scroll + ranked results |
| Accessibility | 44 px touch targets, thumb-zone-safe FABs |

> Delight drives retention.

### Mobile-First Design

```css
/* Design mobile-first, enhance for desktop */
.container {
  padding: 1rem;           /* Mobile default */
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;         /* Tablet+ enhancement */
  }
}
```

---

## 05 — PWA & Offline-First (Decision Tree)

### ⚠️ Important: Offline Mode is NOT Always Required

**Old approach (v1.0):** "Offline mode isn't a feature; it's respect for the user."

**New approach (v2.0):** Evaluate whether offline mode provides actual value.

### Offline Mode Decision Tree

```
Is your app content-dependent (recommendations, search, streaming)?
│
├── YES → Offline-Light Mode
│   ├── PWA manifest for home screen installation ✅
│   ├── Service worker for shell caching ✅
│   ├── NO offline data queuing ❌
│   ├── Show "You're offline" banner
│   └── Standard browser offline handling
│
└── NO → Full Offline Mode
    ├── IndexedDB for offline queuing ✅
    ├── Background sync on reconnect ✅
    ├── Offline banner with retry ✅
    ├── Conflict resolution strategy
    └── Cache images & data separately
```

### Content Categories

| App Type | Offline Strategy | Example |
|----------|------------------|---------|
| **Content-Dependent** | Offline-Light | Streaming apps, Discovery apps, News readers |
| **Data-Entry** | Full Offline | Notes, Expense Tracker, Todo |
| **Communication** | Queue-Based | Email, Messaging |
| **Mixed** | Selective Sync | Social Media, E-commerce |

### Decision Criteria

```typescript
interface OfflineEvaluation {
  apiDependency: 'high' | 'medium' | 'low';
  userWorkflow: 'consumption' | 'creation' | 'mixed';
  dataVolatility: 'high' | 'low';
  offlineUseCases: string[];
}

// Example: Content-dependent app (streaming, discovery)
const contentAppEval: OfflineEvaluation = {
  apiDependency: 'high',       // 100% features need API
  userWorkflow: 'consumption', // Users browse, don't create
  dataVolatility: 'high',      // Content changes frequently
  offlineUseCases: [],         // No meaningful offline use
};
// Result → Offline-Light

// Example: Data-entry app (notes, tasks)
const dataEntryAppEval: OfflineEvaluation = {
  apiDependency: 'low',        // Core features work offline
  userWorkflow: 'creation',    // Users create content
  dataVolatility: 'low',       // User data is stable
  offlineUseCases: ['create_note', 'edit_task'],
};
// Result → Full Offline Mode
```

### Offline-Light Implementation

```typescript
// Minimal PWA setup for content-dependent apps
// public/manifest.json
{
  "name": "[App Name]",
  "short_name": "[App]",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#0f172a"
}

// Service worker: cache shell only
const CACHE_NAME = 'shell-v1';
const SHELL_ASSETS = ['/', '/index.html', '/assets/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});
```

---

## 06 — Security & Privacy

- **Row Level Security (RLS)** enforced at DB
- **Secrets via env vars only**; no secrets in repo
- **PII** minimal and isolated; hashed IDs in analytics
- **JWTs** short-lived; refresh securely
- **CSP, CORS, CSRF** enabled by default
- **Use HTTPS everywhere**
- **Security scanning** via CodeQL in CI/CD

> Privacy by architecture, not policy.

### RLS Policy Template

```sql
-- Enable RLS on all user tables
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own ratings"
ON public.user_ratings FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own ratings"
ON public.user_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Security Checklist

- [ ] RLS enabled on all user tables
- [ ] No API keys in client code
- [ ] JWT validation on all protected endpoints
- [ ] Input validation on all endpoints
- [ ] Rate limiting on public endpoints
- [ ] CodeQL enabled in CI/CD

---

## 07 — Observability-Light

**Now:** Sentry + structured logs (requestId, route, status, duration)
**Later:** OTel tracing and Prometheus metrics behind same interface

### Logger Interface

```typescript
// src/lib/logger.ts
export const logger = {
  info: (event: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', event, ...data, ts: Date.now() }));
  },
  error: (event: string, error: unknown, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', event, error, ...data, ts: Date.now() }));
    // Sentry.captureException(error);
  },
  warn: (event: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', event, ...data, ts: Date.now() }));
  },
};
```

### Metrics Interface

```typescript
// src/lib/metrics.ts
export const metrics = {
  increment: (name: string, tags?: Record<string, string>) => {
    // Future: Prometheus counter
    logger.info('metric_increment', { name, tags });
  },
  histogram: (name: string, value: number, tags?: Record<string, string>) => {
    // Future: Prometheus histogram
    logger.info('metric_histogram', { name, value, tags });
  },
};
```

### Structured Log Format

```json
{
  "level": "info",
  "event": "api_request",
  "requestId": "req_abc123",
  "route": "/v1/ratings",
  "method": "POST",
  "status": 200,
  "duration_ms": 45,
  "ts": 1702742400000
}
```

> See enough to know, not everything to worry.

---

## 08 — Pragmatic Testing

| Layer | Goal | Coverage |
|-------|------|----------|
| Unit | Core logic, pure functions | ≥ 60% |
| Integration | Critical paths only | As needed |
| E2E | 3 happy-paths (auth, main feature, secondary feature) | Required |
| Contract | Schema validation via Zod tests | Always |
| **Edge Function** | **API behavior tests** | **Critical paths** |

### Testing Principles

- Test outcomes, not internals
- Mock adapters, never the domain
- CI runs smoke tests on each PR
- Edge functions tested via HTTP calls

### Test Structure

```typescript
// Domain test (pure, no mocks needed)
describe('saveResource', () => {
  it('should validate value range', async () => {
    const mockRepo = createMockRepository();
    const result = await saveResource(mockRepo, {
      userId: 'user123',
      resourceId: 'res_550',
      value: 11, // Invalid (assuming max 10)
    });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });
});

// E2E test (critical path)
test('user can complete main feature flow', async ({ page }) => {
  await page.goto('/');
  await loginTestUser(page);
  await searchAndSelectItem(page, '[search term]');
  await page.click('[data-testid="action-button"]');
  await page.click('[data-testid="confirm-action"]');
  await expect(page.locator('[data-testid="action-completed"]')).toBeVisible();
});
```

> Confidence is calmness under deployment.

---

## 09 — CI/CD-Lite

Use **Vercel** for frontend deployment (Git Integration). Supabase Edge Functions deploy via `supabase functions deploy`.

### Pipeline Structure

```yaml
# .github/workflows/ci.yml — Phase 1 (always present)
name: CI

on:
  push:
    branches: [main, develop]
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
      - run: npm run build
      - run: npm run test

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

### CI/CD Phase Gates

Not all CI/CD components are needed from day one. Adding them prematurely
creates noise (failing workflows) without value. Follow this phasing:

| Component | Phase | When to add |
|-----------|-------|-------------|
| **CI (lint, typecheck, build, test)** | Phase 1 (Launch) | Always — from first commit |
| **Commitlint** | Phase 1 (Launch) | Always — enforces Conventional Commits |
| **Security scanning (gitleaks, semgrep, osv)** | Phase 1 (Launch) | Always — distributed via dotclaude subtree |
| **CodeQL** | Phase 3 (1k+ DAU) | Requires GitHub Advanced Security for private repos |
| **Lighthouse CI** | Phase 3 (1k+ DAU) | When performance budgets matter |
| **Deploy workflow** | Phase 1 (Launch) | Vercel Git Integration auto-deploys on push to `main` — no custom workflow needed |

**IMPORTANT:** Do NOT add Phase 3 workflows to new projects. They will fail
and provide no value at early stages. The CI workflow template above is
sufficient for Phase 1. Security scanning is distributed automatically via
the dotclaude subtree (`/update-dotclaude`).

```yaml
# Phase 3 additions (only when 1k+ DAU is reached):
#
# .github/workflows/lighthouse-ci.yml
# lighthouse:
#   uses: treosh/lighthouse-ci-action@v12
#   with:
#     configPath: ./lighthouserc.json
#
# .github/workflows/codeql.yml (requires GitHub Advanced Security)
# security:
#   uses: github/codeql-action/init@v3
#   uses: github/codeql-action/analyze@v3
```

### Branch Mapping

- `feature/*` → PR → GitHub Actions (lint, typecheck, test, E2E) + Vercel Preview Deployment
- `main` → Vercel Production Deployment (auto-deploy on merge)

### Conventional Commits

Enforced via commitlint. **Every commit MUST include a body** describing WHAT was changed and WHY.

```
feat: add rating dialog

Implement star-based rating dialog that appears after movie ends.
Ratings are stored in Supabase and used by the recommendation engine.

fix: resolve infinite loop in recommendations

The similarity loop did not exclude already-rated movies, causing
infinite re-renders when the user had rated all items in a cluster.

docs: update API documentation
chore: upgrade dependencies
```

**Commit message rules:**
- **Subject:** Conventional Commit prefix, max 72 chars, imperative mood
- **Body:** MANDATORY for `feat`, `fix`, `refactor`, `test` — describes what changed and why
- **Body:** Optional for `chore`, `docs` (when the subject is self-explanatory)
- Blank line between subject and body
- Body lines max 100 chars

### Rollback Runbook

Store under `/docs/runbooks/rollback.md`:

```markdown
# Rollback Procedure

## Symptoms
- Error rate > 5%
- p95 latency > 2s
- User reports of failures

## Steps
1. Identify failing deployment in Vercel dashboard
2. Click "Redeploy" on the last working deployment (Instant Rollback)
3. Verify metrics return to normal
4. Create incident report
```

> Deploy fast, recover faster.

---

## 10 — Event Schema

Versioned, privacy-safe analytics:

| Event | Purpose | Example Fields |
|-------|---------|----------------|
| v1.user_signed_up | Onboarding complete | userId_hash, lang |
| v1.title_rated | Engagement metric | titleId, stars |
| v1.rec_clicked | Recommendation relevance | titleId, source |
| v1.offline_sync | Reliability | queuedCount |

### Event Schema Format

```json
// events/v1/title_rated.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["event", "version", "timestamp", "data"],
  "properties": {
    "event": { "const": "title_rated" },
    "version": { "const": "1" },
    "timestamp": { "type": "string", "format": "date-time" },
    "data": {
      "type": "object",
      "required": ["titleId", "stars"],
      "properties": {
        "titleId": { "type": "number" },
        "stars": { "type": "number", "minimum": 1, "maximum": 10 },
        "mediaType": { "enum": ["movie", "tv"] }
      }
    }
  }
}
```

Store schemas in `/events/v1/*.json`.

> Track learning, not surveillance.

---

## 11 — Migration Playbook (→ SaaS Readiness)

### Triggers

- ≥ 1k DAU or ≥ 10 req/s p95
- p95 latency > 750 ms for 3 days
- 2 shared packages or 2 app surfaces
- External API error rate > 2%

### Migration Steps

1. Replace logger/metrics with OTel/Prom implementations
2. Swap RepoPort adapter to Postgres/Redis
3. Add QueuePort → SQS/Kafka
4. Add circuit breakers + retries in adapters
5. Move to monorepo if new app surfaces appear
6. Introduce centralized feature-flag provider
7. Expand CI/CD to full pipeline (canary + blue/green)

### Migration Checklist

| Phase | Trigger | Actions |
|-------|---------|---------|
| **Consumer** | 0–500 DAU | Current architecture |
| **Growth** | 500–1k DAU | Add circuit breakers, monitoring |
| **Scale** | 1k+ DAU | Redis cache, queue system |
| **Enterprise** | 10k+ DAU | Full SaaS KB migration |

> The Consumer-Pro KB is the seed; the SaaS KB is the tree.

---

## 12 — Delta Map (Consumer-Pro ↔ SaaS)

| Capability | Consumer-Pro | SaaS-Ready | Shared Boundary |
|------------|--------------|------------|-----------------|
| Contracts | JSON Schema + DTOs | Same + CI validation | ✅ Schema |
| Domain | Pure, framework-free | Same | ✅ Domain |
| Data | HTTP/localDB | Postgres + Redis | ✅ RepoPort |
| Observability | Sentry + Logs | OTel + Metrics + Tracing | ✅ Logger/Metrics |
| Queue/Jobs | None / in-process | SQS/Kafka + DLQ | ✅ QueuePort |
| Flags | Env/in-app | LaunchDarkly / GrowthBook | ✅ Flags API |
| CI/CD | Lint + Smoke | Full pipeline + Canary | ✅ Pipeline spec |
| Docs | README + 1 ADR | ADR + Runbooks | ✅ Format |
| **Multi-Platform** | Web + Edge | Web + Mobile + Edge + Workers | ✅ Contracts |
| **i18n** | Basic setup | Full localization pipeline | ✅ Key structure |

> Migration = swapping implementations, not rewriting code.

---

## 13 — Implementation Priority Matrix

### Phase 1: Launch (Week 1–4)

- ✅ Contracts (Zod validation)
- ✅ Security (RLS + JWT)
- ✅ Consumer UX patterns (skeleton loaders, empty states)
- ✅ PWA basics (manifest, service worker shell)
- ✅ i18n setup (basic structure)
- ✅ CI: lint, typecheck, build, test, commitlint, security scanning
- ⏭️ Skip: Full offline mode, complex observability, Lighthouse CI, CodeQL, separate Deploy workflows

### Phase 2: Traction (100+ DAU)

- ✅ Add: Structured logging (requestId, userId)
- ✅ Add: Error envelope standard
- ✅ Add: 3 E2E tests
- ✅ Add: Ports & Adapters architecture
- ⏭️ Skip: Metrics facade, circuit breakers

### Phase 3: Growth (1k+ DAU)

- ✅ Add: Metrics (Prometheus or Sentry perf)
- ✅ Add: Circuit breakers for external APIs
- ✅ Add: Performance monitoring (Lighthouse CI)
- ✅ Review: Migration triggers in Section 11

---

## 14 — External Dependencies

### Integration Tiers

**Tier 1 (Critical):** App breaks without it

- Pattern: Retry + circuit breaker + fallback
- Example: Content API (with cached fallback)

**Tier 2 (Enhanced):** App works, but diminished

- Pattern: Graceful degradation
- Example: AI features (show fallback content if unavailable)

**Tier 3 (Optional):** Nice to have

- Pattern: Feature flag + async load
- Example: Analytics (user can opt out)

### Circuit Breaker Pattern

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  resetTimeout: number;        // ms before trying again
  halfOpenRequests: number;    // Requests to test recovery
}

const externalApiCircuitBreaker: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenRequests: 1,
};
```

### Retry Configuration

```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};
```

---

## 15 — Performance Targets

### Core Web Vitals

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** | < 2.5s | Largest Contentful Paint |
| **FID** | < 100ms | First Input Delay |
| **CLS** | < 0.1 | Cumulative Layout Shift |
| **INP** | < 200ms | Interaction to Next Paint |
| **TTFB** | < 800ms | Time to First Byte |

### Bundle Budgets

| Asset Type | Budget |
|------------|--------|
| Total bundle | < 500kb gzipped |
| Main JS | < 200kb gzipped |
| CSS | < 50kb gzipped |
| Images | < 200kb per image |

### API Performance

| Metric | Target |
|--------|--------|
| p50 latency | < 200ms |
| p95 latency | < 750ms |
| p99 latency | < 1500ms |
| Error rate | < 1% |

### Enforcement (Lighthouse CI)

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["error", {"maxNumericValue": 300}],
        "speed-index": ["warn", {"maxNumericValue": 4000}]
      }
    }
  }
}
```

---

## 16 — Multi-Platform Architecture

### Repository Strategy

```
┌─────────────────────────────────────────────────────┐
│                    Shared Backend                    │
│         (Supabase Cloud — self-provisioned)         │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Edge Functions  │  Database  │  Auth  │ Storage│ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Web App    │  │ Mobile App  │  │ Admin App   │
│  (React)    │  │ (Flutter)   │  │ (React)     │
│  Vercel     │  │             │  │  Vercel     │
│ Repository: │  │ Repository: │  │ Repository: │
│ project-web │  │ project-app │  │ project-adm │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Shared Contracts

```typescript
// Contracts are source of truth for ALL platforms
// Location: Web repository → /src/contracts/v1/

// Contract flow:
// 1. Define Zod schema in web repo
// 2. Generate OpenAPI spec (npm run generate:openapi)
// 3. Generate Dart types for Flutter (npm run generate:dart)
// 4. Validate at runtime in Edge Functions
```

### Architecture Per Platform

| Platform | Architecture | Rationale |
|----------|--------------|-----------|
| **Web (React + Vite)** | Hexagonal (Ports & Adapters) | Full testability, backend swap |
| **Mobile (Flutter)** | Clean Architecture (MVVM) | Native patterns, widget lifecycle |
| **Backend (Edge)** | Layered + Result Type | Simplicity, stateless |

### Web Architecture (Hexagonal)

```
src/
  ports/           # Interfaces
  adapters/        # Implementations
  domain/          # Pure business logic
  features/        # Feature modules
```

### Mobile Architecture (Clean/MVVM)

```
lib/
  data/            # Repositories, data sources
  domain/          # Entities, use cases
  presentation/    # ViewModels, Widgets
  core/            # Shared utilities
```

### Backend Architecture (Layered)

```
functions/
  _shared/         # Shared utilities
  [function]/
    index.ts       # Handler
    schema.ts      # Validation
    service.ts     # Business logic (if complex)
```

### Shared Principles (Cross-Platform)

1. **Domain models are identical** across platforms
2. **Contracts validated** on every layer
3. **Error Envelope Standard** consistent
4. **Event Schema** shared for analytics
5. **API versioning** via URL path (`/v1/...`)

---

## 17 — Internationalization (i18n) Standards

### i18n Architecture

```
src/i18n/
  config.ts           # i18next configuration
  locales/
    en.json           # English (fallback, always complete)
    de.json           # German
    es.json           # Spanish
    [lang].json       # Additional languages
```

### i18n Rules

| Rule | Description |
|------|-------------|
| **Fallback Language** | Always `en` (English) |
| **Key Structure** | Nested by feature: `[feature].empty`, `auth.login` |
| **Pluralization** | Use i18next ICU format |
| **Date/Number Format** | Use `Intl` APIs |
| **Validation Messages** | Via i18n (user-facing) |
| **Log Messages** | English only (technical layer) |

### Key Naming Convention

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading..."
  },
  "auth": {
    "login": "Log in",
    "logout": "Log out",
    "signup": "Sign up"
  },
  "[feature]": {
    "title": "My [Feature]",
    "empty": "Your [feature] list is empty",
    "addFirst": "Add your first item"
  },
  "errors": {
    "network": "Network error. Please try again.",
    "unauthorized": "Please log in to continue."
  }
}
```

### Language Detection

```typescript
const detectLanguage = (): string => {
  // Priority order:
  // 1. User preference (stored in profile)
  // 2. localStorage fallback
  // 3. Browser language
  // 4. Fallback: 'en'
  
  const stored = localStorage.getItem('language');
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
  
  const browserLang = navigator.language.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en';
};

const SUPPORTED_LANGUAGES = ['en', 'de', 'es'];
```

### Date & Number Formatting

```typescript
// Always use Intl APIs for locale-aware formatting
const formatDate = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const formatNumber = (num: number, locale: string): string => {
  return new Intl.NumberFormat(locale).format(num);
};
```

### Mobile i18n (Flutter)

```dart
// Use flutter_localizations + intl package
// Generate .arb files from shared translation keys

// lib/l10n/app_en.arb
{
  "featureTitle": "My [Feature]",
  "featureEmpty": "Your list is empty"
}

// Maintain parity with web translations
// Use same key structure where possible
```

---

## 18 — Documentation Standards

### Language Policy

| Document Type | Language | Example |
|---------------|----------|---------|
| **Code Comments** | English only | `// Check if user authenticated` |
| **JSDoc/TypeDoc** | English only | `@param userId - The user's ID` |
| **Variable Names** | English only | `isLoading`, `userProfile` |
| **README** | English (+ translations) | `README.md`, `README.de.md` |
| **Architecture Docs** | English only | `/docs/architecture/` |
| **API Docs** | English only | `/docs/api.yaml` |
| **Runbooks** | English only | `/docs/runbooks/` |
| **Commit Messages** | English only | `feat: add rating dialog` |
| **User Guides** | Localized via i18n | In-app help text |

### Architecture Decision Records (ADR)

Store under `/docs/adr/ADR-XXX-title.md`:

```markdown
# ADR-001: Offline Mode Strategy

## Status
Accepted | Rejected | Superseded by ADR-XXX

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult because of this change?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Drawback 1
- Drawback 2

## Date
2025-12-16

## Author
@username
```

### Code Documentation Requirements

```typescript
/**
 * Saves a user resource entry.
 * 
 * @param repo - Repository port for data persistence
 * @param input - Resource data (validated via Zod schema)
 * @returns Result<Resource> - Success with resource or error envelope
 * 
 * @example
 * const result = await saveResource(resourceRepo, {
 *   userId: 'abc123',
 *   resourceId: 'res_550',
 *   value: 8,
 *   type: 'type_a',
 * });
 * 
 * if (result.ok) {
 *   console.log('Saved:', result.data);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 */
export const saveResource = async (
  repo: ResourceRepositoryPort,
  input: ResourceInput
): Promise<Result<Resource>> => {
  // Implementation
};
```

### File Header Template

```typescript
/**
 * @fileoverview Resource service for managing user data.
 * 
 * This service handles the business logic for creating, updating,
 * and retrieving user resources. It uses the repository port pattern
 * for data access abstraction.
 * 
 * @module features/[feature]/service
 */
```

---

## 19 — Edge Function Patterns

### Standard Edge Function Structure

```typescript
// supabase/functions/[function-name]/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { edgeLogger, generateRequestId } from "../_shared/edgeLogger.ts";
import { success, failure, toResponse } from "../_shared/edgeResult.ts";
import { getEdgeConfig, corsHeaders } from "../_shared/edgeConfig.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();
  
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Parse & validate input
    const body = await req.json();
    const validated = InputSchema.safeParse(body);
    if (!validated.success) {
      return toResponse(
        failure("VALIDATION_ERROR", validated.error.message),
        { requestId }
      );
    }

    // 3. Authentication (if required)
    const authHeader = req.headers.get("Authorization");
    const user = await validateJWT(authHeader);
    if (!user) {
      return toResponse(
        failure("UNAUTHORIZED", "Invalid or missing token"),
        { requestId }
      );
    }

    // 4. Rate limiting
    const rateLimitResult = await checkRateLimit(user.id, "function-name");
    if (!rateLimitResult.ok) {
      return toResponse(rateLimitResult, { requestId });
    }

    // 5. Business logic
    const result = await processRequest(validated.data, user, requestId);

    // 6. Log & return
    edgeLogger.info("request_completed", { 
      requestId, 
      userId: user.id,
      status: result.ok ? "success" : "error" 
    });
    
    return toResponse(result, { requestId });
    
  } catch (error) {
    edgeLogger.error("unhandled_error", error, { requestId });
    return toResponse(
      failure("INTERNAL_ERROR", "An unexpected error occurred"),
      { requestId }
    );
  }
});
```

### Shared Utilities (`_shared/`)

| File | Purpose |
|------|---------|
| `edgeConfig.ts` | Environment variables, CORS headers |
| `edgeLogger.ts` | Structured logging with requestId |
| `edgeMetrics.ts` | Metrics facade (ready for Prometheus) |
| `edgeResult.ts` | Result type + response helpers |
| `rateLimit.ts` | Rate limiting logic |

### edgeConfig.ts

```typescript
export const getEdgeConfig = () => ({
  EXTERNAL_API_KEY: Deno.env.get("EXTERNAL_API_KEY") ?? "",
  AI_API_KEY: Deno.env.get("AI_API_KEY") ?? "",
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
});

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
```

### edgeResult.ts

```typescript
export interface Result<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export const success = <T>(data: T): Result<T> => ({ ok: true, data });

export const failure = (code: string, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});

export const toResponse = (
  result: Result<unknown>,
  meta: { requestId: string }
): Response => {
  const status = result.ok ? 200 : getStatusFromCode(result.error?.code);
  return new Response(
    JSON.stringify({ ...result, traceId: meta.requestId }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};

const getStatusFromCode = (code?: string): number => {
  switch (code) {
    case "VALIDATION_ERROR": return 400;
    case "UNAUTHORIZED": return 401;
    case "FORBIDDEN": return 403;
    case "NOT_FOUND": return 404;
    case "RATE_LIMIT": return 429;
    default: return 500;
  }
};
```

### External API Calls Pattern

```typescript
// Pattern: Timeout + Retry + Circuit Breaker

interface FetchConfig {
  timeout: number;
  retries: number;
  backoffBase: number;
}

const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  config: FetchConfig = { timeout: 5000, retries: 3, backoffBase: 1000 }
): Promise<Response> => {
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) return response;
      
      // Retry on server errors
      if (response.status >= 500 && attempt < config.retries) {
        await sleep(config.backoffBase * Math.pow(2, attempt));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === config.retries) throw error;
      await sleep(config.backoffBase * Math.pow(2, attempt));
    }
  }
  throw new Error("Max retries exceeded");
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

---

## 20 — SEO Standards

### SEO Architecture

```
src/lib/seo/
  config.ts       # Global SEO configuration
  constants.ts    # Meta templates, limits, topic clusters
  schemas.ts      # JSON-LD schema generators
  validators.ts   # SEO validation utilities
  internalLinking.ts  # Topic cluster & linking logic

src/components/
  SEOHead.tsx     # Meta tag & JSON-LD component
```

### Required Meta Tags

```tsx
<SEOHead
  title={title}              // Required, max 60 chars
  description={description}  // Required, max 160 chars
  canonical={canonicalUrl}   // Required for all pages
  ogImage={ogImageUrl}       // Required for social sharing
  type="website"             // website | article | product
  noIndex={false}            // Default: indexable
/>
```

### JSON-LD Structured Data

| Page Type | Schema Type | Required Fields |
|-----------|-------------|-----------------|
| **Homepage** | WebSite, Organization | name, url, logo, searchAction |
| **Detail Page** | Article, Product, or domain-specific | name, description, datePublished, image |
| **Search Results** | ItemList | itemListElement[] |
| **FAQ Page** | FAQPage | mainEntity[] |
| **About Page** | AboutPage, Person | name, description |

### Schema Generator Example

```typescript
// src/lib/seo/schemas.ts
export const generateWebSiteSchema = (config: SEOConfig) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": config.siteName,
  "url": config.siteUrl,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${config.siteUrl}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
});

export const generateOrganizationSchema = (config: SEOConfig) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": config.organizationName,
  "url": config.siteUrl,
  "logo": config.logoUrl,
  "sameAs": config.socialProfiles
});
```

### Internal Linking Strategy

```typescript
// Topic Clusters
const TOPIC_CLUSTERS = {
  '/': ['/guide', '/about', '/faq'],           // Homepage links to key pages
  '/guide': ['/explore', '/dashboard'],        // Guide links to features
  '/about': ['/faq', '/privacy', '/terms'],    // About links to legal
};

// Pillar Pages (most important)
const PILLAR_PAGES = ['/', '/guide', '/about', '/faq'];

// Get related pages for internal linking
export const getRelatedPages = (currentPath: string): string[] => {
  return TOPIC_CLUSTERS[currentPath] || [];
};
```

### SEO Validation

```typescript
// Development-only SEO validation hook
export const useSEOValidation = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const issues: string[] = [];
    
    // Check title length
    const title = document.title;
    if (title.length > 60) {
      issues.push(`Title too long: ${title.length} chars (max 60)`);
    }
    
    // Check meta description
    const description = document.querySelector('meta[name="description"]');
    if (!description) {
      issues.push('Missing meta description');
    }
    
    // Check canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      issues.push('Missing canonical URL');
    }
    
    // Check H1
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      issues.push('Missing H1 tag');
    } else if (h1s.length > 1) {
      issues.push(`Multiple H1 tags: ${h1s.length} found`);
    }
    
    if (issues.length > 0) {
      console.warn('SEO Issues:', issues);
    }
  }, []);
};
```

### Sitemap Configuration

```typescript
// scripts/generate-sitemap.ts
const SITEMAP_CONFIG = {
  defaultChangeFreq: 'weekly',
  defaultPriority: 0.5,
  pages: {
    '/': { priority: 1.0, changeFreq: 'daily' },
    '/guide': { priority: 0.9, changeFreq: 'weekly' },
    '/about': { priority: 0.8, changeFreq: 'monthly' },
    '/faq': { priority: 0.8, changeFreq: 'monthly' },
  }
};
```

---

## 21 — Summary

### "Lean Today. Limitless Tomorrow."

The **Consumer-Pro Knowledge Base v3.2** is a **strategic staging layer**.
It allows you to build a consumer-grade product with production discipline, then evolve it into a SaaS-grade system when scale demands.

### What's Different in v3.2 (vs earlier versions)

| Aspect | Before (v1-v2) | Now (v3.2) |
|--------|----------------|------------|
| **Hosting** | Lovable (Preview + Publish) | Vercel (Preview on PR, Production on main) |
| **Supabase** | Lovable-managed | Self-provisioned Supabase Cloud |
| **Framework** | Vite + React | Vite + React (unchanged, Vercel deploys SPA) |
| **Offline Mode** | Dogmatic ("always") | Pragmatic (decision tree) |
| **Platforms** | Web only | Web + Mobile + Backend |
| **SEO** | Not covered | Complete framework |
| **Distribution** | Manual KB upload | Automatic via sync-dotclaude.yml |

### Quick Reference

| Need | Section |
|------|---------|
| API contracts | 03 — Contracts & DTOs |
| Should I implement offline? | 05 — PWA Decision Tree |
| Deployment & Vercel setup | 23 — Claude Code Integration & Deployment |
| Migrate from Lovable | 23.1 — Lovable's Role (Optional Prototyping) |
| Multi-platform strategy | 16 — Multi-Platform Architecture |
| Translation setup | 17 — i18n Standards |
| Edge function structure | 19 — Edge Function Patterns |
| SEO implementation | 20 — SEO Standards |
| When to migrate to SaaS | 11 — Migration Playbook |

### Philosophy

> **Richi AI** defines the philosophy of wisdom and structure.
> **Consumer-Pro KB v3.2** operationalizes it for creators who build small but think big.
> **Vercel** deploys the frontend. **Supabase Cloud** powers the backend.
> **Claude Code** implements. **Cursor** builds the mobile apps.

## 22 — Docs Execution System (Core / Generation / Growth / Runtime)

**Version:** 1.0  
**Status:** ACTIVE  
**Authority:** CONSUMER-PRO ROOT  

---

### 22.0 Purpose

This section defines how execution contracts under `/docs/` are organized, interpreted, and enforced.

This Knowledge Base (`consumer-pro-kb.md`) is the root authority.

All other docs are subordinate execution contracts that must be applied consistently to build, integrate, grow, and operate projects.

This system is designed for a workflow where:

- you define contracts and architecture upfront,
- Claude Code implements on feature branches,
- Vercel deploys automatically on merge to `main`,
- but the contract semantics remain deterministic and enforceable.

---

### 22.1 Directory Taxonomy (Authoritative)

All contracts are stored in `.claude/` and organized by layer:

```text
.claude/
  rules/
    core/
      consumer-pro-kb.md              ← ROOT AUTHORITY
    runtime-contract.md               ← DEPLOYMENT GATE / RUNTIME AUTHORITY

  ref/
    generation/                       ← UI/UX standards & integration contracts
      ui-ux-guide.md
      footer-guide.md
      legal-pages.md
      email-implementation.md
      monetization.md
    backend/                          ← Backend API & pipeline specs
      cinematic-pipeline.md
    prompts/                          ← Agent prompt templates (not standards)
      cinematic-redesign-prompt.md
      chatbot-extractor.md
    growth/                           ← Growth contracts
      analytics.md
      funnel.md
      seo.md
    mobile/
      flutter-kb.md
    lifecycle.md
    ideation-to-product.md
```

Layer meaning must be preserved. File naming may vary.
Prompt templates in `prompts/` are NOT standing standards — they are
on-demand prompts for specific tasks and do not override rules in
`generation/` or `rules/`.

### 22.2 Authority Hierarchy (Highest → Lowest)

1. `consumer-pro-kb.md` (**ROOT AUTHORITY**)
2. `runtime-contract.md` (**RUNTIME AUTHORITY / DEPLOYMENT GATE**)
3. Core execution contracts (`ideation-to-product.md`, `lifecycle.md`)
4. Generation contracts (`ref/generation/*`)
5. Backend contracts (`ref/backend/*`)
6. Growth contracts (`ref/growth/*`)
7. Prompt templates (`ref/prompts/*`) — lowest authority, never override standards

#### Rules

- Higher authority overrides lower authority.
- Runtime contract overrides feature implementation.
- If two docs conflict, the one higher in the hierarchy wins.

---

### 22.3 Contract Semantics (How to Interpret Docs)

Contracts are not “nice-to-have guidance”. They define:

- mandatory structure
- required interfaces
- required behaviors
- deployment eligibility

**AGENT-EXECUTABLE means:** These documents are structured instructions for Claude Code (or any AI agent), executed on explicit user request. The agent does not act autonomously — the user triggers each contract execution by instructing the agent. The agent then follows the contract deterministically.

A contract must be treated as:

- **MUST rules** (blocking when violated)
- **SHOULD rules** (best practice; can be deferred)
- **MAY rules** (optional)

If a contract does not explicitly say “optional”, treat it as mandatory.

---

### 22.4 Lifecycle Phases and Required Contracts

This defines the practical execution order.

---

#### Phase 1 — Product Specification

**Purpose:** create a generator-ready product definition.

**Required:**

- `/docs/00_core/ideation-to-product.md`

**Output:**

- `product_spec` (complete, no empty fields; MVP defined)

---

#### Phase 2 — App Generation (React + Vite + Vercel)

**Purpose:** create the application.

**Required:**

- `/docs/00_core/consumer-pro-kb.md`
- `/docs/01_generation/*` (as applicable)

Implementation must follow:

- Consumer-Pro invariants (contracts, error envelope, typed config, ports/adapters)
- required UI/UX structure
- required legal page structure (if public)
- required integration primitives for Growth if enabled
- React + Vite SPA with Vercel deployment
- Supabase Cloud (self-provisioned) for backend

**Output:**

- working app (deployable to Vercel)

---

#### Phase 3 — Growth Activation (SEO + Funnel + Analytics)

**Purpose:** make the app discoverable, convertible, measurable.

**Required:**

- `/docs/02_growth/analytics-contract.md`
- `/docs/02_growth/funnel-contract.md`
- `/docs/02_growth/seo-contract.md`

**Output:**

- SEO pages + metadata + sitemap + robots
- funnel entrypoints + CTAs + triggers
- analytics core events emitted (no PII)

---

#### Phase 4 — Runtime Validation (Deployment Gate)

**Purpose:** prevent unsafe launches.

**Required:**

- `/docs/03_runtime/runtime-contract.md`

**Output:**

- PASS/FAIL decision

**Rule:**

- Deployment **MUST** be blocked on FAIL.

---

### 22.5 Minimal Context Loading Rule

When building or iterating:

- Always include `consumer-pro-kb.md`
- Include only the contracts relevant to the current phase
- Always re-check runtime contract before deployment

This prevents context overflow while keeping system integrity.

---

### 22.6 Non-Duplication Rule

Avoid repeating the same rule in multiple docs.

Instead:

- reference the authoritative location
- keep one source of truth per rule

**Examples:**

- “Error Envelope” lives in Core Invariants and is enforced by Runtime Contract
- “No PII in Analytics” lives in Analytics Contract and is enforced by Runtime Contract

---

### 22.7 Versioning & Status

Every contract in `/docs/` must contain:

- Version (e.g., `1.0`)
- Status (`ACTIVE` / `DEPRECATED`)
- Scope
- Authority statement (when relevant)

Deprecated contracts must remain readable but must not be executed.

---

### 22.8 System Guarantee

If this structure and authority model is respected, the system guarantees:

- deterministic product generation
- consistent architecture across projects
- growth readiness by default
- runtime safety and debuggability
- scalability without rewrites

---

### 22.9 `.claude/` Distribution

The `.claude/` folder is the single source of truth for all project configuration.
It is maintained in the **orchestrator** repo and distributed automatically.

**Distribution mechanisms:**

| Method | Trigger | Scope |
|--------|---------|-------|
| `sync-dotclaude.yml` | Push to orchestrator `main` | All `*.richi.solutions` GitHub repos |
| `scripts/sync-local.sh` | Manual (`bash scripts/sync-local.sh`) | All local repos on disk |
| `/scaffold-project` skill | New project creation | Copies from orchestrator via GitHub API |

**`.claude/` structure:**

| Directory | Content |
|-----------|---------|
| `rules/core/consumer-pro-kb.md` | This Knowledge Base (ROOT AUTHORITY) |
| `rules/runtime-contract.md` | Deployment gate |
| `ref/` | On-demand reference docs (generation, growth, mobile) |
| `agents/` | Automated sub-agents |
| `skills/` | Slash commands |
| `sync/` | Config files synced to project root |

---

### 22.10 GitHub + Claude Code Workflow

When a project is on GitHub with Claude Code as development environment:

**Environments:**

| Environment | Tool | Trigger |
|-------------|------|---------|
| Development | Claude Code (local) | Manual |
| Preview | Vercel Preview Deployment | Auto-deploy on PR |
| Production | Vercel Production | Auto-deploy on merge to `main` |

**Workflow:**

1. Claude Code works on `feature/*` branch locally
2. Push to GitHub → GitHub Actions run (lint, typecheck, test, E2E)
3. Vercel creates Preview Deployment for the PR
4. PR approved → merge to `main`
5. `main` push → Vercel Production Deployment

**Tool responsibilities:**

- Prototyping (optional): Lovable for rapid UI prototyping
- Implementation: Claude Code (sole implementation tool)
- Hosting: Vercel (frontend) + Supabase Cloud (backend)
- If Lovable prototype exists: use `/migrate-from-lovable` to convert

---

## 23 — Claude Code Integration & Deployment

**Version:** 2.0
**Status:** ACTIVE — applies when `.claude/` is present in the repository root

---

### 23.0 Overview

Claude Code is the **sole implementation tool** for all projects.
Lovable may be used for **optional rapid prototyping** — prototypes are migrated
to the production stack via `/migrate-from-lovable`.

| Tool | Role | When |
|------|------|------|
| **Lovable** | Rapid UI prototyping (optional) | Early exploration only |
| **Claude Code** | Implementation, Testing, CI/CD | Always — sole implementation tool |
| **Vercel** | Frontend hosting & deployment | All web projects |
| **Supabase Cloud** | Backend (Auth, DB, Edge Functions, Storage) | All projects |

**This Knowledge Base** is the single source of truth, stored at
`.claude/rules/core/consumer-pro-kb.md` and distributed via the orchestrator.

---

### 23.1 Lovable's Role (Optional Prototyping)

Lovable may be used for rapid UI/UX prototyping in early stages.

**If Lovable is used:**
- Prototype only — no production deployment via Lovable
- Export the repository to GitHub
- Run `/migrate-from-lovable` to set up Vercel hosting + own Supabase Cloud
- Lovable-generated code is a starting point, not the final architecture

**Lovable MUST NOT:**
- Be used for production hosting
- Be used for Supabase project management (use your own Supabase Cloud projects)
- Make direct commits after the project is migrated

---

### 23.2 Claude Code's Role

Claude Code is the sole implementation tool for all projects.

**Claude Code handles:**
- All code changes (features, bug fixes, refactoring)
- Test implementation (unit, integration, E2E via GitHub Actions)
- CI/CD pipeline execution
- Database migrations and Edge Function updates
- Git workflow (feature branches, PRs, merge to main)
- Vercel deployment management
- Supabase CLI operations

**Claude Code reads from `.claude/`:**
- `CLAUDE.md` — project instructions and architecture overview
- `rules/core/consumer-pro-kb.md` — this Knowledge Base
- `rules/` — all execution contracts (lifecycle, runtime, generation, growth)
- `agents/` — automated sub-agents (code-reviewer, qa, research)
- `skills/` — slash commands (e.g. `/update-dotclaude`, `/migrate-from-lovable`)

---

### 23.3 Implementation Spec Format

When planning features, output a structured spec:

```
IMPLEMENTATION_SPEC:

feature: [feature name]
phase: [Phase X from lifecycle.md]
consumer_pro_contracts: [which rules/ files apply]

description:
[What needs to be implemented — user-facing behavior]

files_affected:
[Known files or feature areas]

acceptance_criteria:
- [ ] [Testable condition 1]
- [ ] [Testable condition 2]
- [ ] [Testable condition 3]

runtime_gate:
[Any runtime-contract.md rules that apply]
```

Claude Code implements the spec on a feature branch.

---

### 23.4 The `.claude/` Folder

The `.claude/` folder in the repository root is Claude Code's configuration layer.

```
.claude/
├── CLAUDE.md                    # Project instructions for Claude Code
├── agents/                      # Automated sub-agents
│   ├── code-reviewer.md         # Code review on demand
│   ├── qa.md                    # Test generation and execution
│   ├── research.md              # Deep research agent
│   └── email-classifier.md      # Email classification
├── skills/                      # Slash commands
│   ├── update-dotclaude/        # Pull latest template updates
│   ├── migrate-from-lovable/    # Lovable → Vercel + Supabase Cloud migration
│   └── scaffold-project/        # New project with Vite + React + Vercel
└── rules/                       # All Consumer-Pro contracts
    ├── core/consumer-pro-kb.md  # This Knowledge Base (authoritative copy)
    ├── lifecycle.md
    ├── runtime-contract.md
    ├── generation/
    ├── growth/
    └── mobile/
```

**Source:** `github.com/richi-solutions/orchestrator.richi.solutions` (distributed via `sync-dotclaude.yml`)

Updates flow from the orchestrator to all projects automatically.

---

### 23.5 Deployment Workflow

```
  Claude Code — feature/* branch
        ↓
  GitHub Push → GitHub Actions
  (lint · typecheck · test · E2E)
        ↓
  Vercel Preview Deployment (auto on PR)
        ↓
  PR → Review → Merge to main
        ↓
  Vercel Production Deployment (auto on main)
```

---

### 23.6 Vercel Configuration

Every project should have a `vercel.json` for Vite SPA configuration:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "regions": ["fra1"],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `rewrites` rule ensures React Router works correctly for client-side routing.

**Environment Variables (Vercel Dashboard):**

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | All | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | All | Supabase anonymous key |

**Vercel CLI Setup:**
```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
```

---

### 23.7 Supabase Cloud Setup

Each project uses its own Supabase Cloud project (self-provisioned at supabase.com).

**Setup:**
```bash
supabase init
supabase link --project-ref <your-project-ref>
supabase db push  # Apply migrations
```

**Environment Separation:**

| Environment | Supabase Project | Vercel Environment |
|-------------|------------------|--------------------|
| Development | Local (`supabase start`) | `.env.local` |
| Preview | Staging Supabase project | Vercel Preview env vars |
| Production | Production Supabase project | Vercel Production env vars |

**Migration Workflow:**
1. Create migration: `supabase migration new <name>`
2. Edit SQL file in `supabase/migrations/`
3. Test locally: `supabase db reset`
4. Deploy: `supabase db push` (after merge to main)

---

### 23.8 Emergency Hotfix Protocol

For critical production fixes:

1. Create hotfix branch from `main`
2. Apply fix via Claude Code
3. Push + merge to `main` (fast-track PR review)
4. Vercel auto-deploys immediately
5. If rollback needed: use Vercel Instant Rollback in dashboard

---

### 23.9 Knowledge Base Sync Rule

This Knowledge Base is stored in one location and distributed automatically:

| Source | Distribution |
|--------|-------------|
| `orchestrator.richi.solutions/.claude/` | `sync-dotclaude.yml` workflow |

When the KB is updated:
1. Update `.claude/rules/core/consumer-pro-kb.md` in the orchestrator repo
2. Push to `main` — `sync-dotclaude.yml` distributes to all `*.richi.solutions` repos
3. For local repos: run `bash scripts/sync-local.sh`

---

## Changelog

### v3.2 (2026-03-11)

- 🔄 **BREAKING:** Switched from Lovable hosting to Vercel for all frontend deployment
- 🔄 **BREAKING:** Switched from Lovable-managed Supabase to self-provisioned Supabase Cloud
- 📝 Default framework remains React + Vite (SPA on Vercel)
- 🔄 Rewrote Section 23: Claude Code Integration — Vercel + Supabase Cloud deployment
- 🔄 Updated Section 02: Folder Blueprint and Routing patterns (framework-agnostic)
- 🔄 Updated Section 09: Branch Mapping to Vercel Preview/Production
- 🔄 Updated Section 16: Multi-Platform Architecture diagram
- 🔄 Updated Section 22: Docs Execution System for Vercel workflow
- 📝 Added Vercel Configuration section (23.6)
- 📝 Added Supabase Cloud Setup section (23.7)
- 📝 Lovable demoted to optional prototyping tool
- 📝 Added `/migrate-from-lovable` skill reference

### v3.1 (2026-02-22) — superseded by v3.2

- ✨ Added Section 23: Claude Code Integration (Dual-Tool Workflow)
- 📝 Defines Claude Code's implementation role
- 📝 Adds IMPLEMENTATION_SPEC handoff protocol
- 📝 Documents .claude/ folder structure
- 📝 Adds Emergency Hotfix Protocol
- 📝 Adds KB Sync Rule

### v3.0 (2026-02-22)

- ✨ Added Section 22.9: Claude Code Migration Mapping
- ✨ Added Section 22.10: GitHub + Claude Code Workflow
- 🔄 Updated Section 09: Branch Mapping
- 📝 Agent header updated

### v2.5 (2026-02-17)

- ✨ Added Section 22: Docs Execution System (Core / Generation / Growth / Runtime)
- 📝 Section 22.3: Added AGENT-EXECUTABLE definition (AI agent, on user request)
- 📝 Section 22.4 Phase 3: Removed (Hub-Spoke architecture deprecated)

### v2.0 (2025-12-16)

- ✨ Added Section 16: Multi-Platform Architecture
- ✨ Added Section 17: Internationalization Standards
- ✨ Added Section 18: Documentation Standards
- ✨ Added Section 19: Edge Function Patterns
- ✨ Added Section 20: SEO Standards
- 🔄 Rewrote Section 05: PWA & Offline-First with Decision Tree
- 📝 Extended Section 01: Added English-only code comments invariant
- 📝 Extended Section 08: Added Edge Function testing layer
- 📝 Extended Section 09: Added Lighthouse CI and CodeQL
- 📝 Extended Section 15: Added enforcement mechanisms

### v1.0 (Initial)

- Initial Consumer-Pro Knowledge Base
