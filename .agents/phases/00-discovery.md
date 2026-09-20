# Phase 00 — Discovery

## Goal

Turn the request into a bounded, repository-grounded problem before proposing
or editing code.

## Required actions

- Read the nearest `AGENTS.md` and relevant package/app documentation.
- Inspect the current implementation, package boundaries, scripts, and git status.
- Identify user-visible behavior, affected workspaces, data boundaries, and risk.
- Check whether an existing component, utility, contract, test, or migration can
  be reused.
- Classify the task before selecting skills: UI, Next.js architecture,
  data/cache, backend/API, database, browser, or cross-cutting.
- Read the narrowest matching skill(s). For Next.js App Router work, start with
  `nextjs-app-architecture`; add `nextjs-cache-architecture` only when reads,
  tags, invalidation, or Cache Components are involved.
- For error handling, API routes, server actions, auth, data fetching, or
  observability, read `docs/ERROR_HANDLING_CONVENTION.md` first.

## Output

Record:

- scope and out-of-scope work;
- affected files/workspaces;
- constraints and assumptions;
- relevant existing patterns;
- open questions that genuinely block implementation.

For feature work, save the findings in the task plan or an execution-plan file;
do not leave important decisions only in chat.

Do not start implementation while a material scope or safety ambiguity remains.
