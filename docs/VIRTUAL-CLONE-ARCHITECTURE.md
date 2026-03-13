# Virtual Clone Architecture — Orchestrator v2

**Version:** 0.1 (Draft)
**Status:** PLANNED — not yet implemented
**Date:** 2026-03-12
**Authority:** Extends `docs/ARCHITECTURE.md` (v1 reference)

---

## Table of Contents

```
00 — Purpose & Vision
01 — Current System Snapshot (v1)
02 — Target Architecture Overview (v2)
03 — New Port Interfaces
04 — Database Schema (Migrations)
05 — RAG Pipeline
06 — Heartbeat System
07 — Action Queue & Approval Flow
08 — Identity Training Pipeline
09 — Claude Code Integration
10 — Phased Implementation Plan
11 — Security Considerations
12 — Architecture Diagrams
13 — Testing Strategy
14 — Risks & Mitigations
15 — New Dependencies
16 — File Structure (v2 Additions)
```

---

## 00 — Purpose & Vision

### What exists today (Orchestrator v1)

A **headless batch scheduler** that runs Claude-powered analysis jobs (security scans,
code reviews, commit summaries, social content generation) across all `richi-solutions`
GitHub repositories. Jobs run on a cron schedule or via HTTP trigger, results are stored
in Supabase. No chat interface, no identity context, no proactive behavior.

### What we're building (Orchestrator v2 — "Virtual Clone")

An **identity-aware, proactive AI agent** that:

1. **Thinks like the owner** — loaded with values, decision patterns, communication style, business knowledge via RAG
2. **Acts proactively** — Heartbeat system that observes job results, interprets them through identity context, and proposes or executes actions
3. **Requires approval for destructive actions** — action queue with risk classification and approval flow
4. **Has a RAG-enabled Identity Store** — 6-layer knowledge base in Supabase with pgvector
5. **Uses Claude Code as chat interface** — no separate web app, `/clone` skill for interaction
6. **Builds on existing infrastructure** — existing jobs become the agent's "senses"; all v1 functionality preserved

### Design Principles

- **Additive, not destructive** — v2 extends v1; no existing functionality is removed or modified
- **Each phase independently valuable** — partial implementation still delivers value
- **Same patterns** — Ports & Adapters, Result\<T\>, Zod validation, structured logging
- **Solo founder optimized** — no over-engineering, minimal new dependencies

---

## 01 — Current System Snapshot (v1)

### Existing Ports & Adapters

| Port | Methods | Adapter |
|------|---------|---------|
| `ClaudePort` | `complete(req): Result<ClaudeResponse>` | `ClaudeAdapter` (Anthropic SDK, retry 3x) |
| `GitHubPort` | `listOrgRepos`, `fileExists`, `readFile`, `listCommitsSince` | `GitHubAdapter` (Octokit) |
| `DiscoveryPort` | `discoverRepos`, `getRepoConfig` | `GitHubDiscoveryAdapter` (1h cache) |
| `StorePort` | `saveJobRun`, `getLatestJobRun`, `listJobRuns`, `saveCommitSummary`, `saveSocialContent` | `SupabaseStoreAdapter` |
| `ExecutorPort` | `execute(jobName, jobDef): Result<JobResult>` | `Executor` (routes by job type) |

### Existing Job Types

| Type | Pattern | Example |
|------|---------|---------|
| `sweep` | Fan-out: 1 Claude call per repo (max 3 parallel) | security-scan, code-review |
| `aggregate` | Collect data from all repos + 1 Claude call | daily-commits |
| `chain` | Wait for upstream job, use output as input | commits-to-social |
| `provision` | Filter repos by criteria (stub) | testuser-sync |

### Existing Database Tables

| Table | Purpose |
|-------|---------|
| `job_runs` | Audit log for every job execution |
| `commit_summaries` | Daily commit aggregation summaries |
| `security_scans` | Per-repo security audit results |
| `code_reviews` | Per-repo code review findings |
| `docs_audits` | Per-repo documentation audits |
| `social_content` | Platform-agnostic content pieces |
| `social_content_components` | Building blocks per content piece |
| `social_content_platforms` | Platform targeting per content piece |

All tables: RLS enabled, `service_role` full access only.

### Key Infrastructure

- **Runtime:** Node.js 22, TypeScript (strict), Express
- **Deployment:** Railway (Docker), `DISABLE_CRON=true`, triggered by GitHub Actions
- **Database:** Supabase Cloud (Postgres 17), service role key access
- **AI:** Anthropic SDK (`claude-sonnet-4-6`)
- **Config:** Zod-validated `env.ts` with fail-fast

---

## 02 — Target Architecture Overview (v2)

```
┌──────────────────────────────────────────────────────────────────────┐
│  TRIGGER LAYER                                                       │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ GitHub Actions│  │ Express HTTP │  │ Claude Code CLI            │ │
│  │ Cron          │  │ /api/trigger │  │ /clone skill               │ │
│  │ (existing)    │  │ /api/chat    │  │ (local chat interface)     │ │
│  │               │  │ /api/actions │  │                            │ │
│  └──────┬────────┘  └──────┬───────┘  └──────────────┬─────────────┘ │
└─────────┼──────────────────┼─────────────────────────┼───────────────┘
          │                  │                         │
┌─────────▼──────────────────▼─────────────────────────▼───────────────┐
│  APPLICATION LAYER                                                    │
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │  Scheduler     │  │  Executor     │  │  ChatHandler            │  │
│  │  (existing)    │  │  (extended)   │  │  (NEW)                  │  │
│  └───────────────┘  └───────────────┘  └─────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  HeartbeatHandler (NEW)                                       │   │
│  │  Observe → Interpret → Decide → Act/Propose                  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  ActionExecutor (NEW)                                         │   │
│  │  Queue management, approval flow, execution, expiration       │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────────┐
│  PORT INTERFACES                                                      │
│                                                                      │
│  EXISTING:                     NEW:                                  │
│  ClaudePort                    EmbeddingPort                         │
│  GitHubPort                    RetrievalPort                         │
│  DiscoveryPort                 ActionPort                            │
│  StorePort                     IdentityStorePort                     │
│  ExecutorPort                  ConversationPort                      │
└─────────▼────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────────┐
│  ADAPTER LAYER                                                        │
│                                                                      │
│  EXISTING:                     NEW:                                  │
│  ClaudeAdapter                 VoyageEmbeddingAdapter                │
│  GitHubAdapter                 PgvectorRetrievalAdapter              │
│  GitHubDiscoveryAdapter        SupabaseActionAdapter                 │
│  SupabaseStoreAdapter          SupabaseIdentityStoreAdapter          │
│                                SupabaseConversationAdapter           │
└─────────▼────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────────┐
│  DATA LAYER (Supabase Postgres 17 + pgvector)                         │
│                                                                      │
│  EXISTING:                     NEW (Identity Store):                 │
│  job_runs                      core_identity                         │
│  commit_summaries              domain_knowledge                      │
│  security_scans                relationships                         │
│  code_reviews                  goals_strategy                        │
│  docs_audits                   episodic_memory                       │
│  social_content (+ children)   operational_state                     │
│                                                                      │
│                                SUPPORT:                              │
│                                pending_actions                       │
│                                conversations                         │
│                                conversation_messages                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Dependency Graph (New → Existing)

```
RetrievalPort  ──→  EmbeddingPort        (needs embeddings for query)
               ──→  IdentityStorePort    (needs pgvector search)

ChatHandler    ──→  ClaudePort           (existing, for completions)
               ──→  RetrievalPort        (for context assembly)
               ──→  ConversationPort     (for history)
               ──→  ActionPort           (for proposing actions)

HeartbeatHandler ──→ StorePort           (existing, reads job_runs)
                 ──→ RetrievalPort       (for identity context)
                 ──→ ClaudePort          (existing, for interpretation)
                 ──→ ActionPort          (for proposing actions)
                 ──→ IdentityStorePort   (updates operational_state)

ActionExecutor   ──→ ActionPort
                 ──→ GitHubPort          (existing, for create_issue actions)
                 ──→ StorePort           (existing, for state updates)
```

---

## 03 — New Port Interfaces

### 3.1 EmbeddingPort

```typescript
// src/embedding/embedding.port.ts

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  tokenCount: number;
}

export interface EmbeddingPort {
  embed(request: EmbeddingRequest): Promise<Result<EmbeddingResponse>>;
  embedBatch(requests: EmbeddingRequest[]): Promise<Result<EmbeddingResponse[]>>;
}
```

**Adapter:** Voyage AI (`voyage-3-large`, 1024 dimensions). Anthropic-endorsed,
best-in-class for technical content. Uses plain HTTP fetch (no SDK needed).
Port abstraction allows swapping to OpenAI `text-embedding-3-small` if needed.

### 3.2 IdentityStorePort

```typescript
// src/identity/identity-store.port.ts

export type IdentityLayer =
  | 'core_identity'
  | 'domain_knowledge'
  | 'relationships'
  | 'goals_strategy'
  | 'episodic_memory'
  | 'operational_state';

export interface IdentityChunk {
  id: string;
  layer: IdentityLayer;
  category: string;           // sub-categorization within layer
  content: string;            // raw text
  embedding?: number[];       // pgvector embedding
  metadata: Record<string, unknown>;
  version: number;            // for conflict resolution
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;         // for operational_state / episodic_memory decay
}

export interface IdentityChunkInput {
  layer: IdentityLayer;
  category: string;
  content: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

export interface IdentityStorePort {
  upsertChunk(input: IdentityChunkInput): Promise<Result<{ id: string }>>;
  upsertChunks(inputs: IdentityChunkInput[]): Promise<Result<{ ids: string[] }>>;
  getChunksByLayer(layer: IdentityLayer, limit?: number): Promise<Result<IdentityChunk[]>>;
  getChunksByCategory(layer: IdentityLayer, category: string): Promise<Result<IdentityChunk[]>>;
  deleteChunk(id: string): Promise<Result<void>>;
  deleteExpired(): Promise<Result<{ deleted: number }>>;
}
```

### 3.3 RetrievalPort

```typescript
// src/retrieval/retrieval.port.ts

export interface RetrievalQuery {
  query: string;
  layers?: IdentityLayer[];         // which layers to search (default: all)
  topK?: number;                    // max results per layer (default: 5)
  similarityThreshold?: number;     // minimum cosine similarity (default: 0.7)
}

export interface RetrievalResult {
  chunks: Array<IdentityChunk & { similarity: number }>;
  totalTokens: number;              // estimated token count of all returned content
  layerBreakdown: Record<IdentityLayer, number>;
}

export interface RetrievalPort {
  search(query: RetrievalQuery): Promise<Result<RetrievalResult>>;
  assembleContext(query: RetrievalQuery, tokenBudget: number): Promise<Result<string>>;
}
```

### 3.4 ActionPort

```typescript
// src/action/action.port.ts

export type ActionRisk = 'low' | 'medium' | 'high';
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired' | 'failed';

export interface PendingAction {
  id: string;
  actionType: string;               // e.g. 'create_issue', 'send_notification'
  description: string;
  risk: ActionRisk;
  payload: Record<string, unknown>;
  reasoning: string;                 // why the agent wants to do this
  source: string;                    // 'heartbeat' | 'chat' | 'job'
  status: ActionStatus;
  expiresAt: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface ActionInput {
  actionType: string;
  description: string;
  risk: ActionRisk;
  payload: Record<string, unknown>;
  reasoning: string;
  source: string;
  expiresAt?: string;               // default: 24h (medium), 48h (high)
}

export interface ActionPort {
  propose(input: ActionInput): Promise<Result<{ id: string }>>;
  approve(id: string, note?: string): Promise<Result<void>>;
  reject(id: string, note?: string): Promise<Result<void>>;
  execute(id: string): Promise<Result<{ output: string }>>;
  listPending(limit?: number): Promise<Result<PendingAction[]>>;
  getAction(id: string): Promise<Result<PendingAction | null>>;
  expireOverdue(): Promise<Result<{ expired: number }>>;
}
```

### 3.5 ConversationPort

```typescript
// src/conversation/conversation.port.ts

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;  // token counts, retrieval stats
  createdAt: string;
}

export interface ConversationPort {
  createConversation(title?: string): Promise<Result<{ id: string }>>;
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<Result<{ id: string }>>;
  getConversation(conversationId: string, limit?: number): Promise<Result<ConversationMessage[]>>;
  listConversations(limit?: number): Promise<Result<Array<{
    id: string; title: string; lastMessageAt: string;
  }>>>;
  getOrCreateToday(): Promise<Result<{ id: string; isNew: boolean }>>;
}
```

### 3.6 Integration Note

No existing ports are modified. All new ports are additive. The composition root
(`server.ts`) is extended to instantiate new adapters and inject them into new handlers.

---

## 04 — Database Schema (Migrations)

### 4.1 Enable pgvector

```sql
-- 20260313000000_enable_pgvector.sql

CREATE EXTENSION IF NOT EXISTS vector;
```

### 4.2 Identity Store (6 Tables)

All tables share the same column pattern with `embedding vector(1024)` for Voyage AI.
Separate tables (not one polymorphic table) because:
- Different RLS policies may evolve per layer
- Queries target 1-2 layers (partition-like access)
- Independent vacuum/analyze statistics

```sql
-- 20260313000001_create_identity_store.sql

-- Layer 1: Core Identity
-- Values, principles, decision patterns, communication style.
-- Rarely changes. Seeded during onboarding.
CREATE TABLE IF NOT EXISTS core_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_core_identity_category ON core_identity (category);
CREATE INDEX idx_core_identity_embedding ON core_identity
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Layer 2: Domain Knowledge
-- Business context, products, market, tech stack.
CREATE TABLE IF NOT EXISTS domain_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_domain_knowledge_category ON domain_knowledge (category);
CREATE INDEX idx_domain_knowledge_embedding ON domain_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Layer 3: Relationships
-- People, stakeholders, dynamics, preferences.
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_relationships_category ON relationships (category);
CREATE INDEX idx_relationships_embedding ON relationships
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Layer 4: Goals & Strategy
-- OKRs, quarterly goals, roadmap, priorities, constraints.
CREATE TABLE IF NOT EXISTS goals_strategy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_goals_strategy_category ON goals_strategy (category);
CREATE INDEX idx_goals_strategy_embedding ON goals_strategy
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Layer 5: Episodic Memory
-- Past decisions, learnings, conversation insights. Grows daily.
CREATE TABLE IF NOT EXISTS episodic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_episodic_memory_category ON episodic_memory (category);
CREATE INDEX idx_episodic_memory_created ON episodic_memory (created_at DESC);
CREATE INDEX idx_episodic_memory_expires ON episodic_memory (expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX idx_episodic_memory_embedding ON episodic_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);

-- Layer 6: Operational State
-- Running projects, blockers, status, deadlines. Ephemeral.
CREATE TABLE IF NOT EXISTS operational_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_operational_state_category ON operational_state (category);
CREATE INDEX idx_operational_state_expires ON operational_state (expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX idx_operational_state_embedding ON operational_state
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- RLS: Service-only access for all identity tables
ALTER TABLE core_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_access" ON core_identity
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON domain_knowledge
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON relationships
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON goals_strategy
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON episodic_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON operational_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 4.3 Pending Actions

```sql
-- 20260313000002_create_pending_actions.sql

CREATE TABLE IF NOT EXISTS pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  payload JSONB NOT NULL DEFAULT '{}',
  reasoning TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired', 'failed')),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  execution_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_actions_status ON pending_actions (status);
CREATE INDEX idx_pending_actions_expires ON pending_actions (expires_at)
  WHERE status = 'pending';
CREATE INDEX idx_pending_actions_created ON pending_actions (created_at DESC);

ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_full_access" ON pending_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 4.4 Conversation History

```sql
-- 20260313000003_create_conversation_history.sql

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_messages_conv
  ON conversation_messages (conversation_id, created_at);
CREATE INDEX idx_conversations_last
  ON conversations (last_message_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_full_access" ON conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON conversation_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 4.5 Semantic Search Function

```sql
-- 20260313000004_create_search_function.sql

-- Generic semantic search that works across all identity tables
CREATE OR REPLACE FUNCTION search_identity_layer(
  target_table TEXT,
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT id, category, content, metadata,
            1 - (embedding <=> $1) AS similarity
     FROM %I
     WHERE embedding IS NOT NULL
       AND 1 - (embedding <=> $1) > $2
     ORDER BY embedding <=> $1
     LIMIT $3',
    target_table
  )
  USING query_embedding, match_threshold, match_count;
END;
$$;
```

### 4.6 IVFFlat Index Scaling Note

IVFFlat indexes use `lists = 10` for tables expected to have <1,000 rows and
`lists = 20` for `episodic_memory` which grows faster. When any table exceeds
~10k rows, switch to HNSW:

```sql
-- Future migration (when row count justifies it):
-- DROP INDEX idx_episodic_memory_embedding;
-- CREATE INDEX idx_episodic_memory_embedding ON episodic_memory
--   USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);
```

---

## 05 — RAG Pipeline

### 5.1 Embedding Generation

**Provider:** Voyage AI (`voyage-3-large`, 1024 dimensions)

- Anthropic-endorsed, best-in-class for technical/code content
- Batch API: up to 128 texts per request
- Cost: ~$0.06 per 1M tokens
- No SDK needed — plain HTTP via Node 22 built-in `fetch`

**Adapter implements `EmbeddingPort`** with retry logic matching existing `ClaudeAdapter`
patterns (3 attempts, exponential backoff on 429/5xx).

### 5.2 Chunking Strategy Per Layer

| Layer | Content Type | Chunk Size | Overlap | Strategy |
|-------|-------------|------------|---------|----------|
| `core_identity` | Short principles, values | 200-500 tokens | 0 | One chunk per principle |
| `domain_knowledge` | Paragraphs, docs | 500-800 tokens | 100 tokens | Paragraph-aware splitting |
| `relationships` | Person descriptions | 200-400 tokens | 0 | One chunk per person |
| `goals_strategy` | OKRs, goals | 300-500 tokens | 0 | One chunk per goal |
| `episodic_memory` | Decision records, learnings | 400-800 tokens | 50 tokens | One chunk per episode |
| `operational_state` | Status updates, deadlines | 200-400 tokens | 0 | One chunk per project/item |

```typescript
// src/identity/chunker.ts

export const LAYER_CHUNKING: Record<IdentityLayer, ChunkingConfig> = {
  core_identity:      { maxTokens: 500,  overlapTokens: 0,   separator: 'none' },
  domain_knowledge:   { maxTokens: 800,  overlapTokens: 100, separator: 'paragraph' },
  relationships:      { maxTokens: 400,  overlapTokens: 0,   separator: 'none' },
  goals_strategy:     { maxTokens: 500,  overlapTokens: 0,   separator: 'none' },
  episodic_memory:    { maxTokens: 800,  overlapTokens: 50,  separator: 'paragraph' },
  operational_state:  { maxTokens: 400,  overlapTokens: 0,   separator: 'none' },
};
```

### 5.3 Query Routing

Not every query needs all 6 layers. Rule-based routing determines which layers to search.

```typescript
// src/retrieval/query-router.ts

// Operational queries → operational_state + goals + episodic
// Decision queries   → core_identity + episodic + domain + goals
// People queries     → relationships + operational
// Domain queries     → domain_knowledge + goals
// Default            → all layers with topK=3
```

**Routing keywords (examples):**

| Intent | Keywords | Layers | Boost |
|--------|----------|--------|-------|
| Status | "status", "blocker", "deadline", "working on" | operational, goals, episodic | operational x1.5 |
| Decision | "should I", "trade-off", "how should" | core, episodic, domain, goals | core x1.3 |
| People | "who", "team", "stakeholder", "contact" | relationships, operational | — |
| Domain | "product", "market", "tech", "architecture" | domain, goals | — |
| Default | (anything else) | all 6 layers | — |

### 5.4 Context Assembly

Builds Claude's system prompt from retrieved identity chunks, respecting a token budget.

```
Layer priority (highest first):
1. core_identity       — always most important
2. operational_state   — current context
3. goals_strategy      — what matters now
4. domain_knowledge    — business context
5. relationships       — people context
6. episodic_memory     — past experience
```

Output format within the system prompt:

```
## Your Identity
[core_identity chunks]

## Current State
[operational_state chunks]

## Goals & Priorities
[goals_strategy chunks]

## Business Context
[domain_knowledge chunks]

## People & Relationships
[relationships chunks]

## Past Decisions & Learnings
[episodic_memory chunks]
```

### 5.5 Token Budget

```
Total Claude context: 200k tokens (claude-sonnet-4-6)

Budget allocation:
  Base system prompt (static)       ~1,000 tokens
  Identity context (RAG)            ~8,000 tokens
  Conversation history              ~4,000 tokens
  Current user message              ~2,000 tokens
  Reserved for response             ~8,000 tokens
  Safety margin                     ~2,000 tokens
  ─────────────────────────────────────────────
  Total used                       ~25,000 tokens
  Available headroom              ~175,000 tokens
```

Conservative budget. For complex queries (e.g., large document review), identity context
budget can be reduced and headroom used for task content.

---

## 06 — Heartbeat System

### 6.1 Integration with Existing Scheduler

Heartbeat becomes a new job type — no new scheduler needed.

```yaml
# Addition to schedule.yaml:
  heartbeat:
    cron: "0 8,14,20 * * *"       # 3x daily: 08:00, 14:00, 20:00 UTC
    type: heartbeat
    agent: heartbeat-agent
    timeout_ms: 300000
```

The existing `Executor` gets a new case. The `JobTypeSchema` adds `'heartbeat'` to its enum.

### 6.2 Heartbeat Decision Loop

```
OBSERVE                        INTERPRET                      DECIDE
┌──────────────────┐    ┌───────────────────────────┐    ┌──────────────────┐
│ Job results (24h)│    │ Claude call with:          │    │ For each action: │
│ Deadlines        │───>│ • Identity context (RAG)   │───>│ risk == low?     │
│ Pending actions  │    │ • Observed signals         │    │   → auto-execute │
│ Commit activity  │    │ • "What should I do?"      │    │ risk == med/hi?  │
│ Goals/OKRs       │    │                            │    │   → propose()    │
└──────────────────┘    └───────────────────────────┘    └──────────────────┘
```

### 6.3 What the Heartbeat Observes

| Signal Source | Data | Method |
|--------------|------|--------|
| Recent job runs | Security findings, code review issues, failed jobs | `store.listJobRuns({ limit: 20 })` |
| Operational state | Current projects, deadlines, blockers | `identity.getChunksByLayer('operational_state')` |
| Pending actions | Unresolved proposals from previous heartbeats | `action.listPending()` |
| Goals | Current OKRs, quarterly priorities | `identity.getChunksByLayer('goals_strategy')` |
| Commit activity | What was built today | `store.getLatestJobRun('daily-commits')` |

### 6.4 Action Classification

```typescript
// src/action/action-classifier.ts

export const ACTION_RISK_MAP: Record<string, ActionRisk> = {
  // Low risk — auto-execute
  'update_operational_state': 'low',
  'save_insight':             'low',
  'save_learning':            'low',
  'update_memory':            'low',

  // Medium risk — needs approval
  'create_github_issue':      'medium',
  'send_notification':        'medium',
  'update_roadmap':           'medium',
  'suggest_priority_change':  'medium',

  // High risk — always needs approval
  'create_pr':                'high',
  'merge_pr':                 'high',
  'deploy':                   'high',
  'delete_resource':          'high',
  'modify_schedule':          'high',
  'external_communication':   'high',
};
```

### 6.5 Heartbeat Outputs

After each heartbeat run:
- **job_runs**: heartbeat result saved (existing pattern)
- **episodic_memory**: insights and interpretations stored as learnings
- **operational_state**: updated with latest project status
- **pending_actions**: medium/high-risk actions queued for approval

---

## 07 — Action Queue & Approval Flow

### 7.1 Lifecycle

```
                    ┌──────────────────┐
                    │ Action proposed  │
                    │ (heartbeat/chat) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼───┐  ┌──────▼──────┐  ┌───▼──────────┐
    │ LOW risk    │  │ MEDIUM risk │  │ HIGH risk    │
    │ auto-execute│  │ queue       │  │ queue        │
    │             │  │ expires: 24h│  │ expires: 48h │
    └─────────────┘  └──────┬──────┘  └───┬──────────┘
                            │             │
                    ┌───────▼─────────────▼──────┐
                    │ User reviews via            │
                    │ /clone actions              │
                    │ /clone approve <id>         │
                    │ /clone reject <id> "reason" │
                    └───────────┬────────────────┘
                                │
                    ┌───────────┼────────────┐
                    │           │            │
              ┌─────▼──┐ ┌────▼────┐ ┌─────▼──────┐
              │APPROVED│ │REJECTED │ │  EXPIRED   │
              │execute │ │log note │ │  auto-mark │
              └────────┘ └─────────┘ └────────────┘
```

### 7.2 HTTP API

```
GET  /api/actions/pending          → list pending actions
POST /api/actions/:id/approve      → approve action (body: { note?: string })
POST /api/actions/:id/reject       → reject action (body: { note?: string })
```

All endpoints protected by existing `requireApiKey` middleware.

### 7.3 Action Execution

The `ActionExecutor` dispatches to registered handlers by `actionType`:

| Handler | Action Type | What it does |
|---------|-------------|--------------|
| `UpdateStateHandler` | `update_operational_state` | Upserts operational_state chunks |
| `SaveInsightHandler` | `save_insight`, `save_learning` | Creates episodic_memory entries |
| `CreateIssueHandler` | `create_github_issue` | Calls `github.createIssue()` |
| `CreatePRHandler` | `create_pr` | Calls GitHub API to create PR |
| `NotificationHandler` | `send_notification` | (future: email/webhook) |

Extensible via handler registration pattern.

### 7.4 Expiration

The heartbeat calls `action.expireOverdue()` at the start of each run.
Alternatively, a lightweight hourly cron job can handle this.

---

## 08 — Identity Training Pipeline

### 8.1 Onboarding Agent (Interview Mode)

A Claude Code agent that conducts a structured interview to populate identity layers.

**Interview per layer:**

**Layer 1 — Core Identity (10-15 questions):**
- What are your top 3 non-negotiable values?
- How do you make decisions when two good options conflict?
- Describe your communication style in 3 words.
- What's your default reaction when something breaks in production?
- How do you handle disagreement with a stakeholder?
- What's your quality vs. speed trade-off preference?
- How do you prioritize when everything is urgent?

**Layer 2 — Domain Knowledge (5-10 questions):**
- What products/services does your company offer?
- Who is your target customer?
- What is your tech stack and why?
- Who are your main competitors?
- What is your business model?

**Layer 3 — Relationships (3-5 questions):**
- Who are the key people you work with regularly?
- For each: role, communication preference, your dynamic?
- External stakeholders (investors, advisors, key clients)?

**Layer 4 — Goals & Strategy (5-8 questions):**
- What are your goals for this quarter?
- What does success look like in 6 months?
- Current constraints (time, money, people)?
- What would you deprioritize if forced to cut scope?

**Layer 5 — Episodic Memory (3-5 seed questions):**
- A recent decision you're proud of?
- A mistake you learned from recently?
- Patterns you've noticed in your decision-making?

**Layer 6 — Operational State (2-3 questions + automated):**
- What are you actively working on right now?
- Any current blockers?
- Upcoming deadlines in the next 2 weeks?

### 8.2 Document Ingestion (Bulk Import)

```typescript
// scripts/ingest-identity.ts
// Usage: npx tsx scripts/ingest-identity.ts \
//   --layer domain_knowledge \
//   --category products \
//   --file ./docs/product-spec.md

// Pipeline:
// 1. Read file
// 2. Chunk by layer config
// 3. Embed all chunks (batch API)
// 4. Upsert to identity store
```

### 8.3 Incremental Learning from Conversations

After each chat conversation, extract identity-relevant information:

- New decisions made → `episodic_memory` (category: `decisions`)
- Preferences revealed → `core_identity` (category: `preferences`)
- Status updates → `operational_state`
- People mentioned → `relationships`

Runs as post-processing after conversation ends or after 30 min inactivity.

### 8.4 Knowledge Decay

| Layer | Decay Strategy | Mechanism |
|-------|---------------|-----------|
| `core_identity` | No decay | Permanent until manually updated |
| `domain_knowledge` | Soft expiry (6 months) | `expires_at` on insert; heartbeat flags stale |
| `relationships` | No decay | Updated on mention |
| `goals_strategy` | Quarterly expiry | `expires_at = quarter_end + 30 days` |
| `episodic_memory` | 90-day rolling window | Starred items never expire |
| `operational_state` | 14-day aggressive expiry | Refreshed by heartbeat |

`deleteExpired()` called by heartbeat at start of each run.

---

## 09 — Claude Code Integration

### 9.1 `/clone` Skill

```
/clone <message>              → chat with the virtual clone
/clone actions                → list pending actions
/clone approve <id>           → approve a pending action
/clone reject <id> "reason"   → reject a pending action
/clone status                 → operational overview
```

The skill calls the orchestrator's HTTP API (`/api/chat`, `/api/actions/*`).
Authentication via the existing `SERVICE_API_KEY`.

### 9.2 Chat API Endpoint

```
POST /api/chat
Body: { message: string, conversationId?: string }

Response: {
  ok: true,
  data: {
    content: string,
    conversationId: string,
    retrievalStats: { chunksUsed, layerBreakdown, totalTokens }
  }
}
```

**Internal flow:**
1. Get or create today's conversation
2. Route query → determine relevant identity layers
3. Embed the query (Voyage AI)
4. Retrieve relevant identity chunks (pgvector)
5. Assemble context (identity + conversation history)
6. Call Claude with assembled system prompt
7. Persist messages (user + assistant)
8. Return response

### 9.3 Base System Prompt

```
You are the Virtual Clone of the owner of richi-solutions.

You think like them, using their values, decision patterns, and communication style.
You have access to their business knowledge, goals, relationships, and current state.

RULES:
1. Answer as the owner would — same tone, judgment, priorities.
2. When you don't know, say so. Never fabricate.
3. For risky decisions, propose as pending action rather than stating as decided.
4. Reference specific knowledge when available ("Based on your Q2 goal of X...").
5. Keep responses concise and direct (matching the owner's style).
6. For destructive/irreversible actions, always propose — never auto-execute.

CONTEXT (populated dynamically):
{identity_context}

CURRENT STATE:
{operational_context}
```

### 9.4 Conversation Management

Conversations grouped by day (`getOrCreateToday()`). Within a Claude Code session,
`conversationId` is passed through subsequent messages. New day = new conversation.

---

## 10 — Phased Implementation Plan

### Phase 1: Identity Store + RAG Infrastructure (Week 1-2)

**Goal:** RAG pipeline works end-to-end. Can ingest documents and query them.

**Tasks:**
1. Enable pgvector extension (migration)
2. Create all 6 identity tables (migration)
3. Create `search_identity_layer` function (migration)
4. Implement `EmbeddingPort` + `VoyageEmbeddingAdapter`
5. Implement `IdentityStorePort` + `SupabaseIdentityStoreAdapter`
6. Implement `RetrievalPort` + `PgvectorRetrievalAdapter`
7. Implement chunker, query router, context assembler
8. Add `VOYAGE_API_KEY` to `env.ts`
9. Write unit tests for pure functions
10. Create `scripts/ingest-identity.ts` for bulk import

**Value:** Can manually ingest documents and query them. Foundation for everything.

**New files:**
```
src/embedding/embedding.port.ts
src/embedding/voyage.adapter.ts
src/identity/identity-store.port.ts
src/identity/supabase-identity-store.adapter.ts
src/identity/chunker.ts
src/retrieval/retrieval.port.ts
src/retrieval/pgvector-retrieval.adapter.ts
src/retrieval/query-router.ts
src/retrieval/context-assembler.ts
scripts/ingest-identity.ts
supabase/migrations/20260313000000_enable_pgvector.sql
supabase/migrations/20260313000001_create_identity_store.sql
supabase/migrations/20260313000004_create_search_function.sql
```

### Phase 2: Onboarding Agent (Week 3)

**Goal:** Interactive interview to populate identity layers.

**Tasks:**
1. Create `agents/onboarding.md` with structured interview questions
2. Create `/clone-onboard` Claude Code skill
3. Create `scripts/seed-identity.ts` for manual seeding
4. Test: run onboarding, verify tables populated, verify RAG retrieval

**Value:** Identity store populated with real data. Clone has a personality.

**New files:**
```
agents/onboarding.md
.claude/skills/clone-onboard/SKILL.md
scripts/seed-identity.ts
```

### Phase 3: Chat Interface (Week 4-5)

**Goal:** Can chat with the Virtual Clone via Claude Code.

**Tasks:**
1. Create conversation tables (migration)
2. Implement `ConversationPort` + `SupabaseConversationAdapter`
3. Implement `ChatHandler`
4. Create `/api/chat` endpoint
5. Create `/clone` Claude Code skill
6. Wire into composition root
7. Test: chat via `/clone`, verify identity-aware responses

**Value:** Owner can talk to the clone. It responds with identity context.

**New files:**
```
src/conversation/conversation.port.ts
src/conversation/supabase-conversation.adapter.ts
src/chat/chat.handler.ts
src/routes/chat.ts
.claude/skills/clone/SKILL.md
supabase/migrations/20260313000003_create_conversation_history.sql
```

### Phase 4: Action Queue + Approval Flow (Week 6-7)

**Goal:** Clone can propose actions and owner can approve/reject.

**Tasks:**
1. Create pending_actions table (migration)
2. Implement `ActionPort` + `SupabaseActionAdapter`
3. Implement `ActionExecutor` with handler registration
4. Implement action handlers (UpdateState, SaveInsight, CreateIssue)
5. Create `/api/actions/*` endpoints
6. Extend `/clone` skill with `actions`, `approve`, `reject` subcommands
7. Implement action classifier

**Value:** Clone can propose, owner approves. Actions are tracked and auditable.

**New files:**
```
src/action/action.port.ts
src/action/supabase-action.adapter.ts
src/action/action-executor.ts
src/action/action-classifier.ts
src/action/handlers/*.ts
src/routes/actions.ts
supabase/migrations/20260313000002_create_pending_actions.sql
```

### Phase 5: Heartbeat System (Week 8-9)

**Goal:** Clone proactively observes, interprets, and acts.

**Tasks:**
1. Add `heartbeat` to job type enum + DB constraint
2. Implement `HeartbeatHandler`
3. Create `agents/heartbeat-agent.md` prompt
4. Add heartbeat to `schedule.yaml`
5. Wire into Executor
6. Implement signal collection + action proposal
7. Test: heartbeat runs, reads signals, proposes actions

**Value:** Clone is now proactive. Observes through identity lens.

**New files:**
```
src/executor/handlers/heartbeat.handler.ts
agents/heartbeat-agent.md
src/routes/heartbeat.ts
supabase/migrations/20260314000000_add_heartbeat_job_type.sql
```

### Phase 6: Learning + Advanced Features (Week 10+)

**Goal:** Clone learns from conversations and gets smarter over time.

**Tasks:**
1. Implement learning-extractor (post-conversation)
2. Auto-create episodic memories from conversations
3. Knowledge decay (expiration of stale data)
4. `/clone teach` command for ad-hoc identity updates
5. Connect existing job results to identity context
6. Proactive recommendations in heartbeat

**New files:**
```
src/identity/learning-extractor.ts
.claude/skills/clone-teach/SKILL.md
```

---

## 11 — Security Considerations

### 11.1 RLS Policies

All new tables follow existing pattern: `service_role` full access, no public access.
Correct for a backend service with no user context.

### 11.2 Sensitive Data

Identity store contains personal information. Mitigations:

1. **Encryption at rest:** Supabase encrypts all data at rest (AES-256). No additional
   application-level encryption needed for single-owner system.
2. **Embeddings:** Cannot be reversed to original text. `content` field contains raw text,
   acceptable for single-owner.
3. **API key:** `SERVICE_API_KEY` minimum 32 chars. Stored in Railway env, never in repo.
4. **Network:** Railway provides HTTPS. Express not exposed without API key guard.
5. **Embedding API:** Content sent to Voyage AI for embedding. For maximum privacy,
   future adapter could use self-hosted model (e.g., `all-MiniLM-L6-v2` via ONNX).

### 11.3 Access Control

| Component | Access | Authentication |
|-----------|--------|---------------|
| Express API | API key (`X-API-Key`) | `requireApiKey` middleware |
| Supabase | Service role key | `supabase-js` |
| Claude Code skill | Local only | No auth needed |
| Voyage AI | API key | Bearer token |

### 11.4 Logging Rules

Identity content MUST NOT appear in logs. Only metadata:

```typescript
// DO:
logger.info('retrieval_complete', { layers: ['core_identity'], chunkCount: 8, tokens: 3200 });

// DON'T:
logger.info('retrieval_complete', { content: chunk.content });
```

---

## 12 — Architecture Diagrams

### 12.1 Chat Interaction Flow

```
User (Claude Code)
     │
     │  /clone "Should I prioritize monetization or growth?"
     │
     ▼
┌────────────────────────┐
│  /clone skill           │
│  curl POST /api/chat    │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  ChatHandler            │
│                         │
│  1. routeQuery()        │──→ layers: [core_identity, goals_strategy,
│     → intent routing    │         domain_knowledge, episodic_memory]
│                         │
│  2. embed(message)      │──→ VoyageEmbeddingAdapter
│     → query vector      │
│                         │
│  3. search(query)       │──→ PgvectorRetrievalAdapter
│     → identity chunks   │    ┌─────────────────────────────┐
│                         │    │  core_identity: 3 chunks     │
│                         │    │  goals_strategy: 2 chunks    │
│                         │    │  domain_knowledge: 2 chunks  │
│                         │    │  episodic_memory: 1 chunk    │
│                         │    └─────────────────────────────┘
│                         │
│  4. assembleContext()   │──→ System prompt with RAG sections
│                         │
│  5. claude.complete()   │──→ ClaudeAdapter (existing)
│                         │
│  6. Persist messages    │──→ SupabaseConversationAdapter
│                         │
│  7. Return response     │
└────────────────────────┘
```

### 12.2 Heartbeat Cycle

```
Cron: "0 8,14,20 * * *"
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│  HeartbeatHandler                                          │
│                                                            │
│  OBSERVE:                                                  │
│  ├── store.listJobRuns({limit: 20})                        │
│  │   → "security-scan: 2 critical findings"               │
│  │   → "daily-commits: 15 commits across 3 repos"         │
│  │                                                         │
│  ├── identity.getChunksByLayer('operational_state')        │
│  │   → "Active: project-a monetization"                   │
│  │   → "Deadline: project-a launch March 20"              │
│  │                                                         │
│  ├── action.listPending()                                  │
│  │   → "1 pending action from yesterday"                  │
│  │                                                         │
│  └── identity.getChunksByLayer('goals_strategy')           │
│      → "Q1: Launch monetization, revenue > X"             │
│                                                            │
│  INTERPRET:                                                │
│  └── claude.complete(heartbeat-agent + signals + identity) │
│      → "Security findings in project-a block launch"      │
│      → "Suggest: create issue for fixes (medium risk)"    │
│                                                            │
│  DECIDE + ACT:                                             │
│  ├── LOW: identity.upsertChunk('operational_state', ...)   │
│  └── MEDIUM: action.propose({ create_github_issue, ... })  │
│                                                            │
│  PERSIST:                                                  │
│  ├── store.saveJobRun(heartbeat result)                    │
│  └── identity.upsertChunk('episodic_memory', insight)      │
└────────────────────────────────────────────────────────────┘
```

### 12.3 Action Approval Flow

```
Heartbeat proposes action
     │
     ▼
┌──────────────┐
│pending_actions│
│ status:       │
│  'pending'    │
│ risk: 'medium'│
│ expires: +24h │
└──────┬───────┘
       │
       │  User: /clone actions
       │        /clone approve act_abc123
       │
       ▼
┌────────────────────────────────────┐
│  ActionExecutor.execute(action)    │
│  handler = handlers[action_type]   │
│  → github.createIssue(payload)     │
│                                    │
│  Update pending_actions:           │
│    status: 'executed'              │
│    resolved_at: now()              │
│    execution_output: "Issue #42"   │
└────────────────────────────────────┘
```

---

## 13 — Testing Strategy

Following existing patterns: vitest, mock ports, no network calls in unit tests.

| Component | Test Type | Mocking Strategy |
|-----------|-----------|-----------------|
| `chunker.ts` | Unit | Pure function, no mocks |
| `query-router.ts` | Unit | Pure function, no mocks |
| `context-assembler.ts` | Unit | Pure function, no mocks |
| `action-classifier.ts` | Unit | Pure function, no mocks |
| `ChatHandler` | Unit | Mock: ClaudePort, RetrievalPort, ConversationPort |
| `HeartbeatHandler` | Unit | Mock: StorePort, IdentityStorePort, RetrievalPort, ClaudePort, ActionPort |
| `ActionExecutor` | Unit | Mock: individual handlers |
| `VoyageEmbeddingAdapter` | Integration | Skip in CI; manual test with real API |
| `PgvectorRetrievalAdapter` | Integration | Local Supabase (`supabase start`) |
| RAG pipeline E2E | E2E | Ingest → embed → search → assemble → verify |

---

## 14 — Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| pgvector not available on Supabase plan | Blocks Phase 1 | Low | Available on all plans; verify during migration |
| Voyage API unavailability | Cannot generate embeddings | Low | Port allows swap to OpenAI embeddings |
| Identity context too large for context window | Degraded responses | Medium | Token budget in context assembler |
| Heartbeat over-proposes actions | User fatigue | Medium | Frequency cap (max 3 proposals per heartbeat) |
| Embedding costs accumulate | Budget concern | Low | ~$0.06/1M tokens; batch API |
| Onboarding takes too long | User abandons | Medium | Progressive: start with Layer 1+4, add others later |
| Hallucination in heartbeat | Incorrect actions | Medium | All med/high risk needs approval; auditable logs |

---

## 15 — New Dependencies

| Package | Purpose | Phase |
|---------|---------|-------|
| (none) | Voyage AI uses Node 22 built-in `fetch` | Phase 1 |
| `tiktoken` (optional) | Accurate token counting for budget management | Phase 1 |

Minimal new dependencies. Port abstraction means the embedding provider can change
without touching application code.

### New Environment Variables

```typescript
// Additions to EnvSchema:
VOYAGE_API_KEY: z.string().min(1).optional(),     // optional until Phase 1 deployment
VOYAGE_MODEL: z.string().default('voyage-3-large'),
```

---

## 16 — File Structure (v2 Additions)

```
src/
  # EXISTING (unchanged):
  server.ts                                  # extended with new wiring
  config/env.ts                              # extended with VOYAGE_API_KEY
  contracts/v1/schedule.schema.ts            # extended with 'heartbeat' type
  executor/executor.ts                       # extended with heartbeat case

  # NEW:
  embedding/
    embedding.port.ts
    voyage.adapter.ts
  identity/
    identity-store.port.ts
    supabase-identity-store.adapter.ts
    chunker.ts
    ingestion.ts
    learning-extractor.ts                    # Phase 6
  retrieval/
    retrieval.port.ts
    pgvector-retrieval.adapter.ts
    query-router.ts
    context-assembler.ts
  conversation/
    conversation.port.ts
    supabase-conversation.adapter.ts
  action/
    action.port.ts
    supabase-action.adapter.ts
    action-executor.ts
    action-classifier.ts
    handlers/
      update-state.handler.ts
      save-insight.handler.ts
      create-issue.handler.ts
  chat/
    chat.handler.ts
  executor/handlers/
    heartbeat.handler.ts
  routes/
    chat.ts
    actions.ts
    heartbeat.ts
  contracts/v1/
    identity.schema.ts
    chat.schema.ts
    action.schema.ts

agents/
  heartbeat-agent.md
  onboarding.md

.claude/skills/
  clone/SKILL.md
  clone-onboard/SKILL.md
  clone-teach/SKILL.md                       # Phase 6

scripts/
  ingest-identity.ts
  seed-identity.ts

supabase/migrations/
  20260313000000_enable_pgvector.sql
  20260313000001_create_identity_store.sql
  20260313000002_create_pending_actions.sql
  20260313000003_create_conversation_history.sql
  20260313000004_create_search_function.sql
  20260314000000_add_heartbeat_job_type.sql
```

---

## Changelog

### v0.1 (2026-03-12) — Initial Draft
- Complete architecture design for Virtual Clone (Orchestrator v2)
- 6-layer Identity Store with pgvector RAG
- Heartbeat system with proactive observe/interpret/decide/act loop
- Action queue with risk-based approval flow
- Claude Code `/clone` skill as chat interface
- 6-phase implementation plan (each phase independently valuable)
