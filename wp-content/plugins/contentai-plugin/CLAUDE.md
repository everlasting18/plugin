# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ContentAI is a WordPress plugin that integrates AI-powered content writing and SEO analysis into the Gutenberg block editor. The git repo tracks **two directories** at WordPress root level:

1. **`wp-content/plugins/contentai-plugin/`** — PHP plugin + React frontend that injects into Gutenberg
2. **`api/`** — Deno + Hono server that proxies AI requests through OpenRouter + PocketBase

The git repo root is at `/Applications/XAMPP/xamppfiles/htdocs/wordpress/`. See `.gitignore` for what is tracked.

## Build Commands

### Plugin Frontend (Vite + React)
```bash
npm run build          # Production build → dist/ (editor.js, admin.js, calendar.js + CSS)
npm run dev            # Watch mode — runs vite build --watch (full rebuild on changes)
```

The Vite build produces **three separate entry points**:
- `editor.jsx` → `dist/editor.js` — Gutenberg sidebar plugin
- `admin.jsx` → `dist/admin.js` — `/write` admin page
- `calendar.jsx` → `dist/calendar.js` — `/calendar` admin page

### API Backend (Deno)
```bash
cd api
deno task dev          # Dev with --watch
deno task start        # Production start
```

### Docker (full stack)
```bash
docker-compose up       # Runs API on 127.0.0.1:3000
```

Uses `api/Dockerfile`. Environment variables: `OPENROUTER_API_KEY`, `TAVILY_API_KEY`, `PB_URL`, `PB_ADMIN_TOKEN`. Defaults: `PORT=3000`, `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`, `OPENROUTER_MODEL=google/gemini-2.5-flash-lite`, `OPENROUTER_MODEL_FALLBACK=google/gemini-2.5-flash-lite`, `FREE_LIMIT=5`.

## Architecture

### Plugin Frontend (`src/`)

Three independent React apps built with Vite:

1. **Gutenberg Editor** (`src/editor/`) — Injected into Gutenberg via `wp.plugins.registerPlugin`
   - `index.jsx` — Entry point, registers the plugin
   - `App.jsx` — Root component managing panel state, keyword, results
   - `left-panel/` — Sidebar UI: keyword input, tone/length/framework selectors, result cards
   - `floating-toolbar/` — Contextual toolbar that appears on text selection for rewrite actions
   - `top-bar/` — Top bar component injected into editor

2. **Admin Write** (`src/admin/`) — Full-page AI writing at `/write`
   - `AdminApp.jsx` — Creates draft posts via WP REST API
   - `PromptInput.jsx`, `SettingsDropdown.jsx` — Input components

3. **Admin Calendar** (`src/calendar/`) — Drag-and-drop content scheduling at `/calendar`
   - `CalendarApp.jsx` — Manages drafts, calendar posts, category filters
   - `CalendarGrid.jsx` — Monthly grid with drag-and-drop scheduling
   - `Sidebar.jsx` — Draft posts list
   - `ScheduleModal.jsx` — Time picker for scheduling

**Shared**: `src/lib/api.js` — API client wrapping fetch calls to backend. WordPress packages (`@wordpress/*`) are externalized and accessed via `wp.*` globals. CSS Modules used throughout.

### PHP Plugin (`contentai.php`)

- Registers admin menu: Dashboard (parent), Write, Calendar, History, Settings
- Enqueues three separate React apps with their WordPress dependencies
- Generates JWT tokens for API auth, passed via `wp_localize_script` as `window.contentaiData`
- Tracks free tier usage (5 generations/month per user) via WordPress options
- Injects CSS for Gutenberg layout integration
- Adds `type="module"` to Vite-built script tags

### API Backend (`api/src/`)

- **Framework**: Hono on Deno
- **License Middleware** (`lib/license.ts`): License verification + usage tracking. Auto-detects PB vs JSON storage.
- **Routes** (`routes/`):
  - `POST /api/generate` — Full articles, intros, conclusions, outlines
  - `POST /api/rewrite` — Text rewriting with tone/style instructions
  - `POST /api/meta` — SEO meta title + description
  - `POST /api/license/verify` — Activate license key
  - `POST /api/license/check` — Quick license verification
- **Prompts** (`prompts/`): Vietnamese prompt templates. Content generation supports 8 frameworks: APP+PAS, AIDA, PAS, E-E-A-T, Hero's Journey, Problem-Solution, Storytelling, News
- **OpenRouter service** (`services/openrouter.ts`): Uses OpenAI SDK pointed at OpenRouter, auto-falls back to `OPENROUTER_MODEL_FALLBACK` on 429/503 errors
- **Config** (`config.ts`): Reads from `.env` — `PORT`, `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`, `OPENROUTER_MODEL_FALLBACK`, `FREE_LIMIT`, `PB_URL`, `PB_ADMIN_TOKEN`

### License Key System

**Dual-mode storage** (auto-detect):
- **Production** (`PB_URL` + `PB_ADMIN_TOKEN` set): PocketBase Cloud
- **Dev** (no PB env): JSON files (`licenses.json`, `usage.json`)

**Middleware flow** (`lib/license.ts` → `routes/mod.ts`):
1. `x-license-key` header present → `verifyLicense()` → Pro tier, unlimited
2. Only `x-site-url` header → `checkUsage()` → Free tier, 5 posts/month
3. Nothing → 401 error

**Tiers:**
- **Free**: 5 bài/tháng, track bằng site_url
- **Pro**: Unlimited, verify bằng license key

**Middleware placement**: `/license/*` routes registered BEFORE middleware to avoid chicken-egg problem. See `docs/LICENSE_SYSTEM.md` for full architecture.

### Data Flow

```
User input (React) → POST /api/generate → License Middleware → Agent Pipeline → OpenRouter → Response
                                           │
                                           ├─ x-license-key → verify (PB/JSON)
                                           └─ x-site-url → checkUsage (PB/JSON)
```

## Key Details

- **UI Language**: Vietnamese throughout
- **API Auth**: License key via `x-license-key` header + site URL via `x-site-url` header (JWT removed)
- **API URL**: `window.contentaiData.apiUrl` from PHP, falls back to `http://localhost:3000/api`
- **Models**: `OPENROUTER_MODEL` and `OPENROUTER_MODEL_FALLBACK` env vars. Defaults: `google/gemini-2.5-flash-lite`
- **License System**: SaaS model — Free (5/month) vs Pro (unlimited). Full docs: `docs/LICENSE_SYSTEM.md`
- **No test framework** is currently configured
