# ContentAI API Architecture

## Runtime

- Entry point thực tế: `src/main.ts`
- Entry point tương thích cho Docker: `main.ts`
- Framework: Hono trên Deno
- AI provider: OpenRouter
- Search provider: Tavily
- Storage mode:
  - PocketBase nếu có `PB_URL` và `PB_ADMIN_TOKEN`
  - JSON fallback qua `src/licenses.json` và `src/usage.json`

## Request Flow

### 1. App Layer

- `src/main.ts`
  - gắn `x-request-id`
  - bật CORS
  - mount `/api`
  - xử lý lỗi tập trung qua `ApiError`

### 2. Route Layer

- `src/routes/*`
- Mỗi route chỉ làm 3 việc:
  - parse JSON body
  - gọi usecase
  - trả response

Route hiện có:

- `/api/generate`
- `/api/rewrite`
- `/api/meta`
- `/api/license/*`
- `/api/logs`

### 3. Middleware Layer

- `src/lib/licenseMiddleware.ts`
- `createLicenseMiddleware()` bảo vệ:
  - `/generate`
  - `/rewrite`
  - `/meta`
  - `/logs`

Rules:

- `x-license-key` phải đi cùng `x-site-url`
- Free tier bị giới hạn theo website
- Pro tier verify theo license + site binding
- `/api/logs` cần thêm `LOGS_ADMIN_TOKEN`

### 4. Usecase Layer

- `src/usecases/generate.ts`
- `src/usecases/rewrite.ts`
- `src/usecases/meta.ts`
- `src/usecases/license.ts`

Nhiệm vụ:

- validate input
- áp business rule
- gọi agent/service tương ứng

### 5. Domain / Agent Layer

- `src/agents/orchestrator.ts`
- `src/agents/research.ts`
- `src/agents/writer.ts`
- `src/agents/editor.ts`

Generate flow:

1. Research
2. Writer
3. Editor gate
4. Revision loop nếu cần
5. Stream `[DONE]`

## Module Map

### Agents

- `contentConfig.ts`: enum, default, normalize
- `frameworkStrategy.ts`: chọn framework thực tế
- `researchQueries.ts`: sinh query web search
- `editorGate.ts`: rule-based gate trước khi gọi editor AI
- `orchestratorUtils.ts`: helper payload/result
- `types.ts`: shared agent types

### Prompts

- `src/prompts/system.ts`: system prompts
- `src/prompts/*.ts`: prompt builder theo tác vụ

### Services

- `src/services/openrouter.ts`: gọi AI, fallback model, parse JSON
- `src/lib/licenseService.ts`: verify/activate license, usage tracking
- `src/tools/search.ts`: web search + format kết quả

### Infra

- `src/lib/http.ts`: parse body, helper đọc kiểu, `ApiError`
- `src/lib/licenseStorage.ts`: PB/JSON storage cho license và usage
- `src/lib/licenseTypes.ts`: shared types cho auth/license
- `src/lib/license.ts`: barrel export tương thích
- `src/lib/logger.ts`: structured logger
- `src/lib/logStore.ts`: in-memory request log capture

## Source Of Truth

- License validity: `licenses` trong PocketBase hoặc `src/licenses.json`
- Free quota usage: `usage` trong PocketBase hoặc `src/usage.json`
- Site binding: `user_domains` trong PocketBase hoặc dữ liệu bind trong `src/licenses.json`
- Auth context runtime: middleware inject vào `c.set("license", ...)`

## Current Tradeoffs

- `logStore` hiện là in-memory, phù hợp debug hơn là audit lâu dài
- JSON fallback hữu ích cho dev nhưng làm code auth/storage phức tạp hơn
