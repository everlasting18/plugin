# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ContentAI is a WordPress plugin that integrates AI-powered content writing and SEO analysis into the Gutenberg block editor. It consists of two parts:

1. **WordPress Plugin** (this repo, `contentai-plugin/`) — PHP plugin + React frontend that injects into Gutenberg
2. **API Backend** (`../../api/`) — Deno + Hono server that proxies AI requests through OpenRouter

## Build Commands

### Plugin Frontend (Vite + React)
```bash
npm run build          # Production build → dist/editor.js + CSS
npm run dev            # Watch mode for development
```

### API Backend (Deno)
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/wordpress/api
deno task dev          # Dev with --watch
deno task start        # Production start
```

### Docker (full stack)
```bash
docker-compose up      # Runs API on localhost:3000
```

## Architecture

### Plugin Frontend (`src/`)
- **Entry point**: `src/editor/index.jsx` — registers a Gutenberg plugin via `wp.plugins.registerPlugin`
- **App.jsx**: Root component rendered in Gutenberg sidebar
- **Left panel** (`src/editor/left-panel/`): Main UI — keyword input, tone/length selectors, quick actions, result cards
- **Top bar** (`src/editor/top-bar/`): TopBar component injected into editor
- **Floating toolbar** (`src/editor/floating-toolbar/`): Contextual toolbar for text selection
- **API client** (`src/lib/api.js`): Wraps fetch calls to backend (`/api/generate`, `/api/rewrite`)
- CSS Modules used throughout with scoped class names (`[name]_[local]_[hash:base64:5]`)
- WordPress packages (`@wordpress/*`) are externalized in Vite config and accessed via `wp.*` globals

### PHP Plugin (`contentai.php`)
- Registers admin menu pages (Dashboard, Write, History, Settings)
- Enqueues editor assets with WordPress dependencies
- Generates JWT tokens for API auth (passed to frontend via `window.contentaiData`)
- Adds `type="module"` to the Vite-built script tag
- Injects CSS for left-panel layout integration with Gutenberg

### API Backend (`api/src/`)
- **Framework**: Hono on Deno
- **Routes** (`routes/`): `/api/generate`, `/api/rewrite`, `/api/meta`
- **Prompts** (`prompts/`): System prompt templates for each route
- **OpenRouter service** (`services/openrouter.ts`): Uses OpenAI SDK pointed at OpenRouter, with automatic model fallback on 429/503
- **Config** (`config.ts`): Reads from env vars (OPENROUTER_API_KEY required)

### Data Flow
1. User interacts with Gutenberg sidebar (React) → calls `api.generate()` or `api.rewrite()`
2. Frontend sends POST to Deno API (`localhost:3000/api/...`)
3. API builds prompt from templates, calls OpenRouter, returns generated content
4. Frontend inserts content into Gutenberg editor blocks

## Key Details

- The plugin UI language is Vietnamese
- `contentaiData` global (via `wp_localize_script`) provides apiUrl, JWT token, userId, usage counts to React
- API URL is hardcoded as `http://localhost:3000/api` in `src/lib/api.js` (dev) and `https://api.contentai.vn/api` in PHP constant
- Free tier limit: 5 generations/month per user, tracked via WordPress options
- No test framework is currently configured
