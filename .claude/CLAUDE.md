# Project Instructions — Richi AI Consumer-Pro Framework

**"Lean Today. Limitless Tomorrow."**

This project follows the **Consumer-Pro Knowledge Base v3.2**.
Full reference: `rules/core/consumer-pro-kb.md`

---

## Authority Hierarchy

1. `rules/core/consumer-pro-kb.md` — ROOT AUTHORITY
2. `rules/runtime-contract.md` — RUNTIME AUTHORITY / DEPLOYMENT GATE
3. `ref/*` — Reference contracts (loaded on demand via `@.claude/ref/<path>`)

Higher authority overrides lower. If two rules conflict, the higher one wins.

---

## Core Invariants (Never Break These)

- **Contracts as Law** — All APIs/events typed and validated via Zod/JSON Schema
- **Ports & Adapters** — Isolate external I/O behind interfaces
- **Domain Purity** — Business logic has no side effects or I/O
- **Error Envelope Standard** — Every function returns `{ ok, data?, error? }`
- **Typed Config Loader** — One validated entry point for all environment vars
- **Versioned Events** — Track app events via stable schemas, no PII
- **English-Only Code Comments** — No exceptions
- **Commit Body Mandatory** — Every `feat`, `fix`, `refactor`, `test` commit includes a body describing what changed and why
- **Secrets via env vars only** — Never in repo or client code
- **RLS enforced** — Row Level Security on all user tables

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Routing:** React Router (SPA pattern with `pages/` folder)
- **Backend:** Supabase Cloud (self-provisioned: Auth, Database, Edge Functions)
- **Hosting:** Vercel
- **Validation:** Zod
- **Testing:** Vitest (unit), Playwright (E2E)
- **CI/CD:** GitHub Actions + Vercel Git Integration

---

## Folder Structure

```
src/
  pages/             # routes (React Router)
  components/        # presentation only
  features/
    [feature]/
      ui/
      service/
      model/
  domain/            # pure use-cases, no I/O
  ports/             # interfaces
  adapters/          # concrete implementations
  lib/               # config, logger, metrics, flags, api client
  i18n/
    locales/
  contracts/
    v1/
supabase/
  functions/
    _shared/
    [function-name]/
```

---

## Branch & Deployment Strategy

```
feature/*  →  PR  →  GitHub Actions (lint, typecheck, test)
                          ↓
             Vercel Preview Deployment (auto on PR)
                          ↓
main       →  Vercel Production Deployment (auto on merge)
```

---

## Development Workflow

- **Prototyping (optional):** Lovable → Export → `/migrate-from-lovable`
- **Implementation:** Claude Code (this environment)
- **Hosting:** Vercel (frontend) + Supabase Cloud (backend)
- **feature branches** for all changes — never commit directly to main

---

## Rules Index

| Rule File | Purpose |
|-----------|---------|
| `rules/core/consumer-pro-kb.md` | Full framework reference (ROOT AUTHORITY) |
| `rules/runtime-contract.md` | Deployment gate — must pass before publish |
| `rules/index.md` | Reference map — on-demand files per task |

All specialized guides (UI/UX, Email, Analytics, Flutter, etc.) are in `.claude/ref/`.
Load them on demand: `@.claude/ref/<path>` — see `rules/index.md` for the full map.

**Mandatory:** When creating or modifying agents or skills, always load
`@.claude/ref/agent-skill-building.md` first. All agents/skills must pass the
quality checklist defined in that guide before commit.

---

## Automated Workflows & Merge Conflict Prevention

The `.claude/` directory is managed centrally by the orchestrator and distributed via automated workflows.

### Workflow Schedule

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `sync-dotclaude.yml` | Daily 05:00 UTC | Distributes `.claude/` from orchestrator to all repos |
| `orchestrate-docs.yml` | Wednesday 08:00 UTC | Runs documentation agent across all repos |

Workflows are staggered so docs always runs **after** sync has completed (3h buffer).

### Off-Limits for Agents and Manual Edits

| Directory | Managed By | Rule |
|-----------|-----------|------|
| `.claude/` | `sync-dotclaude.yml` | **Never modify in target repos.** Changes get overwritten on next sync and cause merge conflicts. All changes go through the orchestrator. |

### Merge Conflict Prevention Rules

1. **PRs auto-merge immediately** — `orchestrate-docs.yml` squash-merges its own PRs to minimize branch lifetime
2. **Workflows are time-staggered** — sync runs daily at 05:00, docs runs Wednesday at 08:00 (after sync)
3. **`.claude/` is excluded from docs PRs** — git add ignores `.claude/`, and the agent prompt forbids modifying it
4. **Use `git pull --rebase`** — locally, always rebase instead of merge to keep history linear

---

## Deployment Gate

Before any production deployment, verify `rules/runtime-contract.md` checklist:

- [ ] Contracts validated (Zod schemas on all API boundaries)
- [ ] Error envelope implemented
- [ ] Config loader validated
- [ ] Logger implemented
- [ ] Analytics emitting required events
- [ ] Legal pages present
- [ ] Secrets secure (no keys in repo)
- [ ] HTTPS enabled
- [ ] RLS enabled on all user tables
- [ ] Vercel project linked and configured
- [ ] Supabase project linked (own Supabase Cloud project)
