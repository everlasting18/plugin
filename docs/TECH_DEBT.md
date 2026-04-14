# ContentAI Technical Debt And Risks

## Scope

This list is intentionally practical.
It focuses on risks that can cause product drift, delivery friction, or production regressions across the current three-part system:

- Deno API
- WordPress plugin
- Astro frontend

Severity meanings:

- `High`: likely to cause incorrect behavior, operational pain, or repeated regressions
- `Medium`: causes maintenance drag or latent bugs, but not the main blocker today
- `Low`: mostly cleanup, clarity, or surface-area reduction

## High

### 1. Split sources of truth for account, domain, and license state

Areas:

- `frontend/src/pages/dashboard.astro`
- `wp-content/plugins/contentai-plugin/contentai.php`
- `api/src/lib/license.ts`

Why it matters:

- The dashboard reads domain records from PocketBase `user_domains`
- The WordPress plugin reads license status from WP options and usage from the API
- The API itself is the real source of truth for license validity and free quota

This means a user can see different answers in different surfaces if one layer is stale.

Current evidence:

- Dashboard computes tier from PocketBase records and usage from `/api/license/usage`
- Plugin injects `licenseKey`, `isPro`, and a usage snapshot from PHP
- API validates requests independently of both UIs

Recommended next step:

- Pick one authoritative customer-domain-license model
- Make all UIs read from that model through a single backend contract

### 2. Build and release flow is machine-specific

Areas:

- `frontend/scripts/build-plugin.mjs`

Why it matters:

- The packaging script hardcodes `/Applications/XAMPP/xamppfiles/htdocs/wordpress/...`
- It assumes local directory layout and local plugin build state
- This blocks portable CI and makes releases dependent on one workstation shape

Recommended next step:

- Replace absolute paths with repo-relative discovery
- Separate plugin build from ZIP packaging
- Make the script runnable in CI without XAMPP-specific assumptions

### 3. No automated regression suite for cross-system flows

Areas:

- whole repo

Why it matters:

- Critical flows cross three systems and several runtimes
- The project currently depends on manual testing for generation, quota, calendar, dashboard, and auth behavior
- Small refactors can silently break contract alignment

Current evidence:

- Manual checklist exists in `wp-content/plugins/contentai-plugin/TESTING.md`
- No automated tests are configured for API, plugin UI, or Astro integration

Recommended next step:

- Add at least contract tests for API routes
- Add smoke tests for plugin generate flow and calendar flow
- Add one end-to-end happy path covering free-tier quota behavior

### 4. REST and AJAX duplicate scheduling and data access logic

Areas:

- `wp-content/plugins/contentai-plugin/contentai.php`
- `wp-content/plugins/contentai-plugin/src/calendar/CalendarApp.jsx`

Why it matters:

- Posts and categories can be fetched via REST or AJAX fallback
- Scheduling is handled through a separate AJAX path
- The REST schedule implementation and AJAX schedule implementation do not normalize time the same way

This is a classic divergence risk: one path gets fixed, the other drifts.

Recommended next step:

- Choose one canonical scheduling path
- Keep only one implementation of date normalization
- Leave fallback only where infrastructure truly requires it

### 5. Development fallback data lives inside `api/src`

Areas:

- `api/src/licenses.json`
- `api/src/usage.json`

Why it matters:

- Runtime mutable data sits inside the source tree
- It is easy to commit test state, confuse environments, or blur source code with local data

Recommended next step:

- Move dev data outside `src/`
- Ignore it explicitly in git
- Make the path configurable

## Medium

### 6. Documentation and code comments are materially out of date

Areas:

- `wp-content/plugins/contentai-plugin/CLAUDE.md`
- `api/FLOW.md`
- older comments in code

Why it matters:

- Some docs still describe removed admin apps, older framework lists, and prior runtime assumptions
- Engineers can make wrong changes if they trust those documents instead of the code

Recommended next step:

- Treat `docs/ARCHITECTURE.md` as the new baseline
- Update or remove stale guidance files

### 7. Compatibility aliases remain in the API contract

Areas:

- `api/src/agents/frameworkStrategy.ts`
- `api/src/agents/researchQueries.ts`
- `api/src/agents/contentConfig.ts`

Why it matters:

- The backend still accepts older values like `none`, `default`, `app_pas`, `hero`, `listicle`, and `business`
- This reduces immediate breakage, but it also hides whether the old contract is still used anywhere

Recommended next step:

- Instrument usage of compatibility aliases
- Remove aliases once consumers are confirmed migrated

### 8. Plugin still carries JWT-shaped data that is no longer part of auth

Areas:

- `wp-content/plugins/contentai-plugin/contentai.php`

Why it matters:

- `contentai_generate_jwt()` and `contentaiData.token` still exist even though current API auth is based on `x-license-key` and `x-site-url`
- Dead auth-looking code adds confusion and future maintenance risk

Recommended next step:

- Remove JWT generation and injected token if it is truly unused
- Update related comments and docs at the same time

### 9. Astro frontend hardcodes infrastructure details in some places

Areas:

- `frontend/src/components/Header.astro`
- `frontend/src/pages/login.astro`
- `frontend/src/pages/dashboard.astro`

Why it matters:

- Some PocketBase and API URLs come from env, some are hardcoded defaults
- This makes staging and production drift easier

Recommended next step:

- Centralize frontend runtime config
- Prefer env-backed values consistently

### 10. Calendar view still depends on low-level response shapes from WordPress

Areas:

- `wp-content/plugins/contentai-plugin/src/calendar/CalendarApp.jsx`
- `wp-content/plugins/contentai-plugin/src/calendar/CalendarGrid.jsx`

Why it matters:

- Category objects are passed through directly from `get_the_category()`
- The UI enriches data client-side instead of consuming a cleaner normalized contract

Recommended next step:

- Normalize calendar payloads in one place on the PHP side
- Keep UI components dumb about WordPress object shapes

## Low

### 11. Marketing copy can drift from backend capability

Areas:

- `frontend/src/components/*`
- `frontend/src/pages/index.astro`

Why it matters:

- Product capability has changed from older framework sets and language assumptions
- Marketing copy already drifted once and had to be corrected

Recommended next step:

- Tie product copy review to backend contract changes

### 12. Architectural naming is still settling after refactors

Areas:

- `framework`, `mode`, `intent`, `strategyHint`
- legacy references to old admin pages

Why it matters:

- Naming is mostly coherent now, but still transitioning
- This is not a bug by itself, but it increases onboarding cost

Recommended next step:

- Stabilize a short glossary in docs and reuse those exact terms in prompts, UI, and code

## Suggested Order Of Attack

1. Unify source-of-truth boundaries for license, domain, and account data
2. Make build and packaging portable
3. Add automated regression coverage for API contracts and plugin happy paths
4. Collapse duplicate REST/AJAX logic where possible
5. Remove stale docs and dead auth code
