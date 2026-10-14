# PR Lifecycle Policy

## Purpose

This runbook establishes PR age thresholds, epic branch expectations, and triage cadence
for the `combsmith/broodly` repository.

## Automated Stale Detection

The `.github/workflows/stale.yml` workflow runs weekly and applies the following thresholds:

| Item | Stale after | Closed after |
|------|-------------|--------------|
| Issues | 60 days of inactivity | 7 days with `stale` label |
| Regular PRs | 30 days of inactivity | 7 days with `stale` label |
| Draft PRs (epic branches) | **Exempt** | **Exempt** |

Draft PRs are exempt because epic branches are long-running work-in-progress slices that span
multiple stories. They must not be auto-closed; see the epic branch policy below.

### Preventing Auto-Close

To prevent automated closure of any specific issue or PR, apply the `pinned`, `keep-open`, or `security` label.
The `security` label is also exempt for issues (inherited from the stale workflow configuration).

## Epic Branch Policy

Epic branches (`epic*-*`) represent foundational feature slices. They are always in DRAFT state
until the epic is feature-complete and all stories pass CI.

| Cadence | Action |
|---------|--------|
| On push to `main` | `auto-rebase.yml` rebases non-draft PRs onto `main` automatically (also available via manual dispatch) |
| Monthly | Manually verify epic branches are rebased; trigger `auto-rebase.yml` as needed |
| Quarterly | Full epic triage: confirm each epic is still in scope; close any de-prioritized branches |

An epic branch should be closed when:
- The epic is de-scoped or replaced by a design change
- The feature set it implements has been merged through a different branch
- The branch has been stale for more than 90 days with no commit activity

## Regular PR Thresholds

- **30 days** without activity → `stale` label applied, warning comment posted
- **37 days** (30 + 7 grace) without activity → PR closed automatically

Activity resets the clock: any push, comment, review, or label change counts.

## Triage Cadence

| Frequency | Who | Action |
|-----------|-----|--------|
| Weekly | Dev lead / bot | Review non-draft PRs that are `BLOCKED` or failing CI; escalate blockers |
| Monthly | Dev lead | Rebase check on draft epic PRs; verify CI currency |
| Quarterly | Team | Epic triage review — decide keep / close / reprioritize for each open epic branch |

## Background

This policy was established in response to the broodly PR backlog growing to 16 open PRs
(primarily long-lived epic branches) identified during the 2026-04-05 org CI/Security survey.
See issue #73 for the original triage.
