# ContentAI Architecture

## Scope

This document describes the project as it exists in the repository today.
It is based on the current code, not on older notes that still mention removed admin apps or older framework lists.

The repository root is the WordPress install:

- `api/`: Deno + Hono backend for AI generation, licensing, quota, and logs
- `frontend/`: Astro marketing site, login flow, dashboard, and plugin download packaging
- `wp-content/plugins/contentai-plugin/`: WordPress plugin used inside wp-admin and Gutenberg

## System Map

### 1. API backend

Location: `api/src`

Responsibilities:

- Expose `/api/generate`, `/api/rewrite`, `/api/meta`, `/api/license/*`, `/api/logs`
- Enforce license and free-tier quota before content routes
- Run the content pipeline: research, planning, writing, editorial review
- Call OpenRouter for LLM work
- Call Tavily for web search when research is enabled
- Persist license and usage data via PocketBase or JSON fallback

Main entry points:

- `main.ts`: app bootstrap, CORS, request id, error handling
- `routes/mod.ts`: route registration and middleware order
- `lib/license.ts`: license verification, free quota tracking, middleware
- `agents/orchestrator.ts`: top-level generation pipeline

### 2. WordPress plugin

Location: `wp-content/plugins/contentai-plugin`

Responsibilities:

- Add WordPress admin pages: Dashboard, Calendar, Settings
- Inject the ContentAI panel into Gutenberg
- Pass `window.contentaiData` to JS with API URL, site URL, license key, and quota snapshot
- Expose internal WordPress REST and AJAX endpoints for drafts, categories, and scheduling
- Build and ship the editor and calendar frontend bundles

Current JS apps in the plugin:

- `src/editor/`: Gutenberg plugin UI
- `src/calendar/`: calendar and scheduling UI
- `src/lib/api.js`: API client for the Deno backend
- `src/lib/blocks.js`: normalization helpers for Gutenberg block insertion

Main PHP entry point:

- `contentai.php`

### 3. Astro frontend

Location: `frontend/src`

Responsibilities:

- Public landing page
- Google login via PocketBase client SDK
- Dashboard for domain list and license-related UX
- Plugin download endpoint and packaging support

Important pages:

- `pages/index.astro`: landing page
- `pages/login.astro`: login page
- `pages/dashboard.astro`: account and domain dashboard
- `pages/auth/callback.astro`: PocketBase OAuth callback

## Runtime Boundaries

### Boundary A: WordPress plugin -> API backend

This is the primary production flow for content generation.

The plugin calls the backend directly with:

- `x-license-key`
- `x-site-url`
- JSON body including `keyword`, `count`, `audience`, `language`, `framework`, `length`, `webSearch`

The backend is the source of truth for:

- whether generation is allowed
- free quota remaining
- actual number of posts consumed by a request
- final generated content

### Boundary B: Astro frontend -> PocketBase + API backend

The public site uses PocketBase client auth in the browser and also calls the API backend for `/license/verify` and `/license/usage`.

This means the Astro app is not only a presentation layer. It coordinates two different backends:

- PocketBase for user-facing domain records and auth
- Deno API for license verification and usage numbers

### Boundary C: WordPress plugin -> WordPress data layer

The calendar and editor work with WordPress-native data:

- posts
- categories
- scheduling
- admin pages

Those flows use a mix of:

- WP REST routes under `contentai/v1/*`
- AJAX fallbacks under `admin-ajax.php`

## External Services

- OpenRouter: LLM inference
- Tavily: web search for research
- PocketBase: optional production storage for licenses and usage, plus website auth/domain data

Key env vars for the API:

- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_MODEL`
- `OPENROUTER_MODEL_FALLBACK`
- `TAVILY_API_KEY`
- `PB_URL`
- `PB_ADMIN_TOKEN`

## Content Generation Flow

### 1. Request entry

`POST /api/generate`

Handled by:

- `routes/generate.ts`
- `lib/license.ts`

The route normalizes defaults from `agents/contentConfig.ts`, validates the keyword, and checks whether the requested post count exceeds the free quota remaining.

### 2. License gate

The parent router applies `createLicenseMiddleware()` to content routes.

Two paths exist:

- Pro path: verify `x-license-key`
- Free path: use `x-site-url` and current month usage

If the request is allowed, middleware stores an auth context on the request.

### 3. Orchestration

`agents/orchestrator.ts` coordinates:

1. framework planning via `frameworkStrategy.ts`
2. research via `research.ts`
3. writing via `writer.ts`
4. editor gate and optional revision via `editorGate.ts` and `editor.ts`

The orchestrator streams progress lines and finally emits `[DONE] { ... }`.

### 4. Research

`agents/research.ts`:

- builds search queries with `researchQueries.ts`
- calls Tavily through `tools/search.ts`
- dedupes and caps results
- asks the model to summarize findings into structured research data

If web search is disabled or no usable results are found, research falls back to a minimal structure rather than failing the request.

### 5. Writing

`agents/writer.ts`:

- builds a writer prompt from research, language, framework, and strategy hint
- requests Gutenberg-compatible HTML blocks
- applies a cleanup pass for newline artifacts

The current public writing modes are:

- `auto`
- `adaptive_hybrid`
- `eeat_skyscraper`
- `howto`
- `pas`
- `aida`

### 6. Editorial review

`agents/editorGate.ts` runs cheap structural checks first.

If the draft fails those checks:

- `editor.ts` runs a review model call
- a single rewrite attempt is allowed
- a final editorial review runs after rewrite

If the draft passes the gate, the expensive editor path is skipped.

### 7. Free-tier usage increment

Usage is now incremented after generation completes, based on the number of posts actually returned by the orchestrator.

That behavior lives in `routes/generate.ts`, not in the middleware.

## License and Quota Architecture

### Storage modes

The API supports two storage modes:

- PocketBase mode when `PB_URL` and `PB_ADMIN_TOKEN` are configured
- JSON fallback mode using `api/src/licenses.json` and `api/src/usage.json`

### API routes

- `POST /api/license/verify`: activate and verify a key against a site URL
- `POST /api/license/check`: verify without activation
- `POST /api/license/usage`: read usage for a domain

### Source of truth

The API backend is the source of truth for:

- license validity
- tier
- monthly usage counts
- remaining free quota

WordPress and Astro both cache or mirror parts of this state for UI convenience.

## WordPress Plugin Architecture

### Admin pages

The current plugin pages are:

- `ContentAI > Dashboard`
- `ContentAI > Lịch nội dung`
- `ContentAI > Cài đặt`

Legacy slugs like `contentai-write` and `contentai-history` are redirected, not rendered by dedicated React apps anymore.

### Gutenberg editor integration

`src/editor/index.jsx` registers the plugin.

`src/editor/App.jsx` mounts:

- top bar toggle
- left panel
- floating toolbar for rewrite actions

The left panel is the main generate UI:

- prompt entry
- generation settings
- progress stream
- result cards
- block insertion

### Calendar

`src/calendar/CalendarApp.jsx` loads:

- draft posts
- scheduled and published posts for the current month
- categories

It prefers WP REST routes, then falls back to AJAX for environments where REST is blocked.

Scheduling itself currently uses the AJAX endpoint directly.

## Astro Frontend Architecture

### Public site

The Astro site handles:

- marketing copy
- authentication entry
- account dashboard
- plugin ZIP download

### Auth model

The frontend currently uses PocketBase client auth in the browser.

That auth state is separate from:

- WordPress authentication
- Deno API license authentication

### Dashboard model

`pages/dashboard.astro` reads domain records from PocketBase `user_domains`, then reads usage counts from `POST /api/license/usage`.

As a result, the dashboard is an integration layer between:

- PocketBase user/domain records
- API quota and license state

## Build and Release

### API

Managed with Deno tasks:

- `deno task dev`
- `deno task start`

### Plugin

Managed with Vite:

- `npm run build` in `wp-content/plugins/contentai-plugin`

Outputs:

- `dist/editor.js`
- `dist/calendar.js`
- related CSS and chunks

### Plugin ZIP

`frontend/scripts/build-plugin.mjs` packages the plugin into `frontend/public/plugin.zip`.

That script currently assumes a local absolute path to the WordPress plugin directory.

## Current Sources of Truth

Use this table when deciding where a change should live.

| Concern | Current source of truth |
| --- | --- |
| License validity | API backend |
| Free quota count | API backend |
| Generated content | API backend |
| WordPress post data | WordPress |
| Calendar scheduling state | WordPress |
| Public-site login session | PocketBase browser auth |
| Dashboard domain list | PocketBase `user_domains` |
| Plugin runtime config | `window.contentaiData` injected by PHP |

## Known Architectural Tension

The system works, but it is not a single-backend design.

There are three partially overlapping state systems:

- WordPress options and admin pages
- API license and usage storage
- PocketBase user-facing account/domain data

That split is the main reason architectural clarity matters in this repository.
