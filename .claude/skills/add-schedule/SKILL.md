---
name: add-schedule
description: Adds a new scheduled job to the orchestrator. Updates schedule.yaml, orchestrate-cron.yml, and verifies consistency. Use /add-schedule [job description] to invoke.
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
argument-hint: "[job-name: description of the job]"
---

# Add Scheduled Job

Add a new scheduled job to the orchestrator based on: `$ARGUMENTS`

## Architecture Context

The orchestrator uses a **dual-trigger architecture**:

1. **schedule.yaml** — Source of truth for job definitions (type, cron, agent, targets, timeout)
2. **GitHub Actions orchestrate-cron.yml** — Reliable cron trigger that calls the server's HTTP API
3. **Server /api/trigger/:jobName** — Receives the trigger, executes the job via the Executor

In-process `node-cron` is disabled in production (`DISABLE_CRON=true`).
GitHub Actions fires the cron and calls `POST /api/trigger/:jobName` with `X-API-Key` auth.

**Both files must stay in sync. A job in schedule.yaml without a matching cron in orchestrate-cron.yml will never run in production.**

## Current state

Schedule: !`cat schedule.yaml`
Workflow crons: !`grep -A1 "cron:" .github/workflows/orchestrate-cron.yml | head -20`
Existing job types: !`grep "type:" schedule.yaml`
Existing agents: !`ls agents/*.md 2>/dev/null | sed 's|agents/||;s|\.md||'`

## Step 1: Determine Job Parameters

Based on the description, determine:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Kebab-case job name (e.g. `weekly-digest`) |
| `cron` | Yes | Cron expression (UTC). Use https://crontab.guru format |
| `type` | Yes | One of: `sweep`, `aggregate`, `chain`, `provision` |
| `agent` | No | Agent name (must exist in `agents/` dir or be created) |
| `targets` | No | `all` (default) or array of filter objects |
| `depends_on` | No | Name of upstream job (only for `chain` type) |
| `timeout_ms` | No | Timeout in ms (default: 120000) |

### Job Type Reference

| Type | Use for | How it works |
|------|---------|-------------|
| `sweep` | Run agent across all discovered repos | Iterates repos, runs Claude agent per repo |
| `aggregate` | Collect data across repos, summarize | Collects commits/data, generates summary via Claude |
| `chain` | Post-process output of another job | Reads upstream job result, transforms via Claude |
| `provision` | Repo setup/sync tasks | Runs provisioning logic on matching repos |

## Step 2: Update schedule.yaml

Add the new job entry to `schedule.yaml`. Follow the existing format exactly:

```yaml
  job-name:
    cron: "M H * * *"          # Comment explaining when (human-readable)
    type: <type>
    agent: <agent-name>        # omit if not needed
    targets: all               # or specific filter
    depends_on: <upstream>     # only for chain type
    timeout_ms: 120000
```

## Step 3: Update orchestrate-cron.yml

Three places must be updated in `.github/workflows/orchestrate-cron.yml`:

### 3a. Add cron schedule entry

Under `on.schedule`, add:
```yaml
    - cron: "M H * * *"       # job-name — Human-readable schedule
```

### 3b. Add case in "Determine job name" step

In the `case "$CRON"` block, add:
```bash
              "M H * * *")    echo "name=job-name"        >> "$GITHUB_OUTPUT" ;;
```

### 3c. Add to workflow_dispatch options

Under `inputs.job_name.options`, add:
```yaml
          - job-name
```

## Step 4: Create Agent File (if needed)

If the job specifies an `agent` that doesn't exist in `agents/`, create `agents/<agent-name>.md`.

The agent file is a system prompt for Claude. It should contain:
- Role description
- What input it receives
- Expected output format
- Any constraints or rules

Read an existing agent file as reference: !`ls agents/*.md | head -1`

## Step 5: Verify Consistency

Run these checks:

1. **Cron sync check**: Every job in `schedule.yaml` must have a matching cron in `orchestrate-cron.yml`
2. **Case statement check**: Every cron in the workflow must have a case entry
3. **Options check**: Every job must be in the `workflow_dispatch` options list
4. **Agent check**: If `agent` is specified, `agents/<name>.md` must exist
5. **Schema check**: Job definition must match `src/contracts/v1/schedule.schema.ts`
6. **Build check**: Run `npm run build` to verify no TypeScript errors

## Step 6: Run Tests

```bash
npm run build && npm test
```

Both must pass before committing.

## Step 7: Summary

Output:
```
## Schedule Added: <job-name>

| Parameter | Value |
|-----------|-------|
| Cron | `<expression>` (<human readable>) |
| Type | `<type>` |
| Agent | `<agent-name>` |
| Targets | `<targets>` |

### Files Modified
- `schedule.yaml` — Added job definition
- `.github/workflows/orchestrate-cron.yml` — Added cron trigger + case + option

### Files Created (if any)
- `agents/<name>.md` — Agent system prompt

### Next Steps
- [ ] Commit and push to main
- [ ] Verify in GitHub Actions > Orchestrate Cron > Run workflow > select <job-name>
- [ ] Check Supabase `job_runs` table for new entry
```
