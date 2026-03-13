# ghars PRD

## Product thesis

`ghars` is a portfolio observability dashboard for GitHub stars. It helps power users understand what they have saved, what is heating up, and what is worth revisiting, instead of treating stars as a flat bookmark list.

## Primary user

- Individual GitHub power users with large star histories, typically 200+ repositories
- People who repeatedly think, "I saw something useful the other day," but cannot recover it quickly from GitHub's native stars UX

## Core value

- Faster recall of previously starred repositories
- Better understanding of portfolio structure, drift, and momentum
- A tighter loop between starring a repository and actually starting or watching it

## Success metrics

- First import success rate above 95%
- Time-to-find target repo under 10 seconds for annotated items
- Weekly dashboard return rate above 40%
- At least 25% of imported repos receive a note, state change, or other user touch within 30 days

## V1 scope

- GitHub-only authentication through Auth.js
- Login and GitHub authorization are the same flow
- Server-owned GitHub OAuth app credentials
- No user-managed GitHub tokens or env setup
- Import public starred repositories for the signed-in user
- Dashboard-first experience with live imported data as the system of record
- Search, analytics, repo detail, and reports built on top of the imported portfolio
- Convex-backed persistence, snapshots, and scheduled refresh jobs

## V1 non-goals

- Email or password login
- Separate "connect GitHub" step after login
- Private repo access beyond what the approved GitHub OAuth flow grants
- Browser extension
- Team collaboration
- GitHub Lists integration
- BYOK AI settings in the active v1 plan

## Locked auth model

- Auth provider: Auth.js
- Identity provider: GitHub only
- User flow:
  - user arrives signed out
  - user clicks `Continue with GitHub`
  - GitHub OAuth authenticates the user and grants access
  - ghars stores the returned access token server-side
  - ghars imports and syncs that user's stars
- Anonymous users never see another user's imported data

## Current implementation boundary

- The public landing page and route protection are real
- The dashboard import slice is real
- Search, analytics, reports, and repo detail still render demo-backed UI data
- Pure service-layer coverage is ahead of current UI integration coverage
