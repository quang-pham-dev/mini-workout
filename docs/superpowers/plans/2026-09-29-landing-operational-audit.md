# Landing Operational Audit

**Status:** In progress
**Date:** 2026-09-29
**Owner:** `apps/landing`

## Goal

Implement the offline portion of Phase 7 item 1: a deterministic scheduled
report for broken internal links, stale Campaigns and expired experiments using
the same validated published-content and experiment contracts as the site.

## Scope

- pure operational-audit policy with an injected clock;
- published-route and internal-link inventory;
- Campaign expiry-soon and stale-archive findings;
- experiment expiry, cleanup and expiry-soon findings;
- stable severity/code/path output without content, provider errors or secrets;
- local workspace command and scheduled/manual GitHub Actions workflow;
- fixture-safe default with opt-in public Sanity published-source variables.

Excluded:

- live URL crawling, DNS or deployment verification;
- paging/on-call integration or automatic content mutation;
- Sanity drafts or a server read token;
- PostHog result analysis, SLO definitions and alerts from Phase 7 item 2.

## Policy

Internal links must resolve to a currently published page. Authored links that
still target a Campaign redirect receive a warning so editors can update them;
links to gone or scheduled Campaign routes fail as broken. Redirect destinations
must resolve to a published page.

Active Campaigns warn seven days before end. Archived Campaign pages warn after
30 days so indefinite stale promotional content receives an owner review.
Experiments warn seven days before end, fail if still enabled after end, and
fail after their cleanup date whether enabled or not.

## Delivery sequence

1. RED tests for links, Campaign lifecycle, experiment expiry and deterministic
   issue ordering.
2. Implement pure policy and stable output contract.
3. Add a fail-closed CLI boundary using the existing published repository.
4. Add a least-privilege scheduled/manual GitHub Actions workflow and operator
   documentation.
5. Run focused and full Landing verification, workflow syntax/policy checks,
   boundaries and docs; commit RED and GREEN checkpoints.

## Acceptance criteria

1. Valid current fixtures produce no issue.
2. Missing targets and broken redirect destinations fail with stable codes and
   source paths only.
3. Time-based findings are deterministic from the injected clock and thresholds.
4. A dependency/configuration failure prints one stable boundary code, not raw
   CMS/provider data.
5. The scheduled workflow has read-only permissions, concurrency control,
   timeout and no secret requirement.
