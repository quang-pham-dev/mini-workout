# Project Agent Harness

This directory contains the project-local agent harness for Mini Workout.
Skills are vendored under `skills/`; reusable delivery phases are under
`phases/`. The harness is shared by Codex and other supported agents through
the project scope.

## Standard delivery loop

Every non-trivial task should pass through these phases in order:

1. `00-discovery.md` — establish scope, constraints, and repository facts.
2. `01-plan.md` — define the smallest implementation plan and acceptance criteria.
3. `02-design.md` — resolve UI, API, data, and architecture decisions before coding.
4. `03-implementation.md` — make the change using existing project conventions.
5. `04-verification.md` — run focused checks, then the appropriate workspace checks.
6. `05-review.md` — review correctness, regressions, security, accessibility, and maintainability.
7. `06-handoff.md` — report changes, evidence, risks, and follow-up work.

Small documentation-only changes may combine discovery and planning, but the
agent should still provide verification and handoff evidence.

## Feature start and finish contract

When starting a feature, the agent must first:

1. read the root and nearest scoped `AGENTS.md` files;
2. run `git status --short` and inspect the affected app/package;
3. classify the work as UI, App Router architecture, data/cache, backend/API,
   database, or cross-cutting;
4. read the matching skill(s) and produce discovery findings plus a plan;
5. identify acceptance criteria and the verification command before editing.

The agent must finish with a handoff that includes the changed files, checks
run and their results, migrations/environment changes, known risks, and
follow-ups. A feature is not done merely because the code compiles.

The human-readable operating guide is [`../docs/AGENT_WORKFLOW.md`](../docs/AGENT_WORKFLOW.md).

## Skill routing

| Concern                    | Preferred skills                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Repository discovery       | `find-skills`, `turborepo`                                                               |
| UI implementation          | `design-taste-frontend`, `vercel-composition-patterns`, `vercel-react-view-transitions`  |
| UI review                  | `web-design-guidelines`, `vercel-react-best-practices`                                   |
| Component stories / a11y   | `storybook`                                                                              |
| Next.js architecture       | `nextjs-app-architecture`, `nextjs-cache-architecture`                                   |
| Admin app (TanStack Start) | `tanstack-start`                                                                         |
| Authentication             | `better-auth`                                                                            |
| Observability / errors     | `observability-convention`                                                               |
| Prisma and database        | `prisma-database-setup`, `prisma-client-api`, `prisma-postgres`, `nextjs-cache-architecture` |
| Client data fetching       | `tanstack-query`, `tanstack-query-best-practices`                                      |
| Backend/API (packages)     | `nodejs-best-practices`                                                                  |
| Browser verification       | `playwright-cli`                                                                         |
| Code review                | `code-review`, `web-design-guidelines`, `vercel-react-best-practices`                    |
| CI and automation          | `github-actions-templates`, `turborepo`                                                  |

Use the narrowest applicable skill. Skills are guidance, not permission to
skip repository rules, tests, security checks, or human review.

## Source of truth

- Repository-wide engineering rules: [`../AGENTS.md`](../AGENTS.md)
- Skill versions and sources: [`../skills-lock.json`](../skills-lock.json)
- Product and architecture documentation: [`../docs/README.md`](../docs/README.md)

Do not edit installed skill content to encode project-specific rules. Add or
update project rules in `AGENTS.md`, `docs/`, or a phase file instead.

External skills are copied into the repository but remain untrusted guidance.
Review their `SKILL.md` before first use, especially skills marked high or
critical risk. Never give a skill permission to commit, publish, delete data,
or access secrets unless that action is explicitly part of the task.
