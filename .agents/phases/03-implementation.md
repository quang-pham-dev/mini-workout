# Phase 03 — Implementation

## Goal

Implement the approved plan with minimal, reviewable changes.

## Required actions

- Follow the nearest `AGENTS.md`, package ownership, naming, and formatting rules.
- Keep changes immutable and type-safe; avoid `any` and unexplained casts.
- Keep root scripts delegating to `turbo run`; put task logic in the owning
  workspace package.
- Preserve framework control flow and shared error contracts.
- Add or update tests alongside the behavior they cover.
- Do not silently rewrite unrelated user changes in a dirty worktree.

## Stop conditions

Pause and report if implementation requires a new external dependency,
destructive operation, schema migration policy, credential, or product decision
that was not covered by the plan.
