# Agent Workflow for Feature Development

This is the team-facing operating guide for using the project harness. The
agent must use the repository rules and phase files; a prompt alone is not the
source of truth.

## Start here

Give the agent a feature request with:

- the user outcome and acceptance criteria;
- links to the issue/spec/design, if available;
- the affected app/package or route, if known;
- constraints such as backward compatibility, performance, or migration limits.

The agent's first response should be a short discovery summary and plan. Before
editing, it must read the relevant `AGENTS.md`, inspect the current code and git
status, classify the task, select skills, and name the checks it will run.

Do not start with “implement this” without a behavior or acceptance criterion.
If the request is underspecified but safe to explore, the agent should make
the smallest reversible assumption and state it. It should stop only when the
missing decision changes scope, data safety, authorization, or product behavior.

## Task size and required rigor

| Size   | Examples                                       | Required workflow                                                          |
| ------ | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Small  | copy, docs, isolated styling                   | Discovery + plan can be combined; verify and hand off                      |
| Medium | component, route, query, server action         | All seven phases; focused tests and review                                 |
| Large  | schema, auth, cross-app, caching, architecture | All seven phases + execution plan + decision record + full affected checks |

## Skill routing

### UI and interaction

Start with `frontend-design` or `design-taste-frontend` for new visual work,
then use `vercel-composition-patterns` for component API shape. Add
`vercel-react-view-transitions` only when the interaction communicates spatial
continuity or state continuity. Finish with `web-design-guidelines` and the
relevant React performance checks.

### Next.js App Router

Start with `nextjs-app-architecture` for route/page/feature placement, RSC
boundaries, Suspense, server actions, skeletons, or client/server decisions.
Add `nextjs-cache-architecture` for `use cache`, `cacheLife`, cache tags,
invalidations, personalized data, or Cache Components. Do not introduce cache
directives just because the skill exists; first establish the freshness and
personalization contract.

### Backend and persistence

Use `nodejs-backend-patterns` for API/server boundaries and operational
concerns. Use `nodejs-best-practices` for framework/runtime/async architecture
decisions, not as a copy-paste template. Use the Prisma skills for schema,
queries, migrations, and provider-specific work. Follow
`docs/ERROR_HANDLING_CONVENTION.md` whenever the change touches errors, routes,
server functions, auth, data fetching, or observability.

### Client data fetching

Use `tanstack-query` and `tanstack-query-best-practices` when a feature needs
client-side query caching, mutations, invalidation, optimistic updates, or
TanStack Query SSR hydration. Keep server reads and writes in the owning
feature/server boundary; do not move Prisma access into client components.
For `apps/admin`, also follow the local `tanstack-start` skill and preserve
request isolation during SSR.

### Verification and review

Use `playwright-cli` for real browser journeys and visual evidence. Use
`code-review` only for a defined diff baseline and a supplied or discoverable
spec. It is a review tool, not an implementation planner, and its upstream
skill expects `docs/agents/issue-tracker.md`; do not fabricate that file or a
spec when it is absent.

## Required artifacts

For medium and large features, keep durable work in the repository:

- active execution plan: `docs/superpowers/plans/`;
- completed plan: move or mark it according to the existing project convention;
- architecture/product decision: the relevant `docs/` document or an ADR;
- generated schema/API documentation: the owning package/app docs;
- test and browser evidence: the standard test-report locations.

The plan must contain scope, decisions, affected workspaces, acceptance
criteria, test strategy, verification commands, and risks. Update progress and
decisions as implementation changes the plan.

## Definition of done

A feature is done when:

1. acceptance criteria are met;
2. ownership and architecture boundaries are correct;
3. error, auth, validation, cache, and observability behavior are intentional;
4. focused and risk-appropriate checks pass;
5. the diff has been reviewed for regressions and scope creep;
6. the handoff reports evidence, limitations, migrations, and follow-ups.

“Build passed” alone is not a definition of done.

## Human control points

The team owns product scope, security-sensitive decisions, migrations,
production rollout, and external communication. Agents may draft and verify
these changes, but must ask before committing, pushing, publishing, deleting
material data, or introducing credentials/secrets.

## Harness improvement policy

When an agent repeats a failure, convert the lesson into a targeted rule,
checker, test, or documentation update. Prefer mechanical checks over adding
more prose to `AGENTS.md`. Review this guide quarterly and remove rules that no
longer describe the codebase.
