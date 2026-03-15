# Prompt: Company Knowledge Base as Bundled Level-2 Documents

> **Type:** Prompt Template — generates a structured company knowledge base
> from repository content.

## Role
You are a Senior Technical Writer and Knowledge Architect with experience in SaaS, compliance (GDPR), customer support documentation, and internal engineering handbooks. You write precisely, comprehensively, and in a way that is suitable both for human readers and for later AI usage (e.g. RAG systems).

## Goal
Create a **bundled company knowledge base**.
You must generate **exactly N documents**, with **one document per second-level heading (H2)** from the provided structure.

Example:
- H2 "Company & Product Understanding" = 1 document covering all related topics
- H2 "Customer Knowledge & Support" = 1 document
- H2 "Legal & Trust" = 1 document
- etc.

## Input should be available in the repository.
If specific company information is missing, use clear placeholders in square brackets, for example:
- [Company Name]
- [Product Name]
- [Target Audience]
- [Industry]
- [Region/Countries]
- [Support Channel]
- [Privacy Contact]
- [Pricing Plans]
- [Tech Stack]
- [SLA/Support Hours]
- [Data Categories]
- [Hosting/Region]
- [Security Standards]

Important: Do not ask follow-up questions. Use placeholders instead.

## Output format (strict)
Return the result as **multiple Markdown files** in **one single output**.

### File naming convention
Use the following file names (kebab-case, ASCII only, numbered):
- `01-company-and-product-understanding.md`
- `02-customer-knowledge-and-support.md`
- `03-legal-and-trust.md`
- `04-sales-and-marketing.md`
- `05-company-governance-and-strategy-internal.md`
- `06-processes-and-operations-internal.md`
- `07-technology-and-architecture-internal.md`
- `08-ai-automation-and-ip-internal.md`
- `09-legal-finance-hr-internal.md`
- `10-knowledge-management-and-learning-internal.md`

### Document header (mandatory in EVERY file)
At the very top include:
- Title (H1)
- `Owner:` [Role/Team]
- `Audience:` Public / Internal
- `Confidentiality:` Public / Internal / Restricted
- `Last updated:` [YYYY-MM-DD]
- `Version:` v1.0
- `Status:` Draft / Approved
- `Related docs:` links or placeholders

## Writing rules (mandatory)
1. Write clearly, fact-based, without marketing language.
2. Use short paragraphs, clean lists, consistent terminology.
3. Structure each document with meaningful H2/H3/H4 headings.
4. Define key terms briefly at first occurrence.
5. Use tables where appropriate (e.g. support channels, escalation paths, roles, SLAs).
6. Include operational sections: responsibilities, processes, checklists.
7. Write so the documents are directly usable for onboarding, support, engineering, and audits.
8. Do not invent legal commitments; use placeholders where legal details are unclear.
9. Strictly separate public and internal content.

## Content requirements per document

### 01-company-and-product-understanding.md (Public)
Must include:
- Company overview: problem, solution, value proposition, target audiences
- Product/service catalog: overview, scope, key capabilities
- Use cases & best practices: 5–10 concrete examples
- Boundaries / non-goals: what the product is NOT
- Mini glossary: 10–20 core terms

### 02-customer-knowledge-and-support.md (Public)
Must include:
- FAQ: minimum 20 Q&As (generic, with placeholders)
- Getting started: setup, first steps, quick start
- User guide: feature areas, common user flows
- Troubleshooting: symptom → cause → resolution (min. 15 entries)
- Release notes / changelog template
- Status & incident communication: channels, sample messages

### 03-legal-and-trust.md (Public)
Must include:
- Legal documentation map: which document covers what (imprint, privacy, terms, etc.)
- Privacy overview: data categories, purposes, legal bases (placeholders), user rights
- Security & trust overview: principles, access control, encryption (placeholders)
- Open-source / licensing notes (if applicable): usage, attribution, restrictions
- Compliance statement (optional): positioning or roadmap without claims

### 04-sales-and-marketing.md (Public)
Must include:
- Pricing & billing guide: plans, invoicing, cancellations, upgrades, refunds (placeholders)
- Customer onboarding guide (first 30 days): goals, milestones, checklist
- Partner / affiliate guide: rules, brand usage, tracking (placeholders)
- Public API documentation (if applicable): auth, rate limits, versioning, examples (placeholders)

### 05-company-governance-and-strategy-internal.md (Internal)
Must include:
- Strategy & roadmap: principles, prioritization logic, trade-offs
- OKRs / KPIs: definitions, measurement logic, cadence
- Roles & responsibilities: RACI or similar
- Escalation paths & decision rights
- Risk overview: top 10 risks with mitigation strategies

### 06-processes-and-operations-internal.md (Internal)
Must include:
- SOP index: list with short descriptions
- Incident management playbook: roles, workflow, severity levels, postmortems
- Change management: RFC process, approvals, rollback
- QA guidelines: definition of done, test types, acceptance checklists
- Risk register template with example entries

### 07-technology-and-architecture-internal.md (Internal / Restricted)
Must include:
- High-level architecture: components, data flows, dependencies (textual)
- Detailed architecture: services, interfaces, sequences
- Data model: core entities, ownership, lifecycle
- API contracts: versioning, breaking change policy, example payloads (placeholders)
- Security: threat model, trust boundaries, secrets handling
- Infrastructure & deployment: environments, CI/CD, rollback
- Observability: logging, tracing, metrics, alerting, runbooks

### 08-ai-automation-and-ip-internal.md (Internal)
Must include:
- AI usage policy: allowed data, prohibited data, redaction rules
- Prompting & automation standards: naming, versioning, testing, reviews
- Model routing & cost control: guidelines, limits, budgeting
- Evaluation framework: quality metrics, golden datasets, regression tests
- IP & content licensing strategy: internal rules, attribution, rights chain

### 09-legal-finance-hr-internal.md (Internal / Restricted)
Must include:
- Internal compliance handbook: mandatory processes, audit trails (placeholders)
- Contract templates index: when to use which template, approval flow
- HR handbook: onboarding, policies, performance, absence (generic)
- Offboarding checklist: access removal, knowledge transfer, asset return
- Finance operations: invoicing, payment approvals, cost centers (placeholders)

### 10-knowledge-management-and-learning-internal.md (Internal)
Must include:
- Extended glossary: 30–60 terms
- Decision log: format and example
- Lessons learned / postmortems: format and example
- Internal FAQ: "how we do things here"
- Documentation policy: ownership, review cycles, versioning, archiving

## Quality checklist (self-review before output)
- Exactly 10 files with the specified filenames?
- Complete document header in every file?
- Consistent placeholder usage?
- Clear separation of public vs. internal content?
- Each document at least ~800–1500 words where feasible?
- Tables, checklists, and templates included?
- Output is pure Markdown, no explanations outside the files?

## Execute now
Generate the 10 Markdown files according to this specification as a single combined output.
