# Phase 01 — Plan

## Goal

Define the smallest safe change that satisfies the request.

## Required actions

- Translate the request into observable acceptance criteria.
- Choose the owning app/package for every new type, component, route, or query.
- Identify required migrations, environment changes, tests, and documentation.
- Choose the skill sequence explicitly. Avoid activating overlapping skills
  unless each one contributes a distinct check.
- Prefer existing workspace scripts and Turborepo tasks over ad hoc commands.
- Plan tests before implementation; include regression coverage for changed behavior.

## Plan format

1. Files and responsibilities.
2. Data/control-flow changes.
3. Test strategy.
4. Verification commands.
5. Risks and rollback considerations.

For medium or larger features, also record the plan under the active execution
plan location described in [`docs/AGENT_WORKFLOW.md`](../../docs/AGENT_WORKFLOW.md).

Avoid speculative abstractions, generic type packages, and unrelated cleanup.
