# Agent Harness Review

## Current assessment

The project has a strong initial harness, but it is currently a documented
workflow rather than an enforcement system. The foundation is appropriate for
this Turborepo + Next.js + Prisma stack:

- project-local skills are copied into `.agents/skills/` and tracked by
  `skills-lock.json`;
- `AGENTS.md` is the repository entry point and delegates deeper guidance;
- phases separate discovery, planning, design, implementation, verification,
  review, and handoff;
- `pnpm docs:check` excludes vendored upstream skill references and checks
  project-owned documentation.

## Gaps to address

### P0 — make feature work reproducible

- Add an execution-plan template with scope, acceptance criteria, decisions,
  affected packages, verification, and progress.
- Add a lightweight architectural decision record template for schema, cache,
  auth, API, and cross-app boundaries.
- Define the expected report shape in pull requests so the agent handoff is
  reviewable by humans.

### P1 — add mechanical guardrails

- Add a checker that validates skill directories have `SKILL.md`, detects
  duplicate skill names, and verifies `skills-lock.json` is present.
- Add architecture checks for Next.js pages importing queries, missing
  `server-only`/`use server` boundaries, and invalid package imports.
- Add a cache contract check once Cache Components is enabled: tags and
  invalidation helpers should be feature-owned and mutations should invalidate
  the affected identity.
- Keep vendored skill content out of project docs checks, as done now.

### P1 — make risk explicit

- Maintain an allowlist of approved external skill sources and a review date.
- Classify skills as guidance-only, review-only, or execution-capable.
- Require human approval for skills that can publish, modify external systems,
  access secrets, or perform destructive actions.
- Re-review `code-review`, which the installer reported as high risk, before
  using it in automated or unattended workflows.

### P2 — close the learning loop

- Track recurring agent failures and turn them into tests or narrow rules.
- Add a small quality score by domain: architecture, UI/accessibility,
  reliability, security, performance, and test confidence.
- Schedule documentation gardening so stale docs and broken cross-links are
  fixed instead of accumulating.

## Comparison with mature agent-first practice

The most useful public pattern is not a larger prompt. It is a small entry
point plus a structured repository knowledge base, executable plans, and
mechanical checks. OpenAI describes the same approach in its harness
engineering write-up: `AGENTS.md` acts as a map, deeper knowledge lives in
structured docs, plans are versioned, and custom linters/structural tests
enforce freshness and invariants.

This project already has the map and phase structure. The next maturity step is
to add versioned execution plans, decision records, domain quality checks, and
skill governance without bloating `AGENTS.md`.

## Recommended target layout

```text
AGENTS.md                         # short repository map and hard rules
.agents/
  README.md                       # harness entry point and skill routing
  phases/                         # reusable delivery contracts
  skills/                         # copied external skills + lockfile
docs/
  AGENT_WORKFLOW.md               # team operating guide
  AGENT_HARNESS_REVIEW.md         # maturity gaps and roadmap
  architecture/                   # durable system decisions
  design-decisions/               # feature-level ADRs
  superpowers/plans/              # active/completed execution plans
scripts/
  check-docs.mjs                  # documentation integrity
  check-agent-harness.mjs         # future skill/phase/lock checks
```

The project should not create an agent-specific abstraction layer in
application code. The harness should remain repository-native Markdown plus
small deterministic checks, with agents responsible for using the same
Turborepo commands and package boundaries as human contributors.

## External references

- [OpenAI — Harness engineering](https://openai.com/index/harness-engineering/)
- [OpenAI — AGENTS.md and repository instructions](https://developers.openai.com/codex/guides/agents-md)
- [Next.js — `use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Next.js — Cache Components](https://nextjs.org/docs/app/getting-started/partial-prerendering)
- [Turborepo — documentation](https://turborepo.com/docs)
