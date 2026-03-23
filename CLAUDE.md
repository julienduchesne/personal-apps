# Personal Apps — Monorepo

## Structure

Turborepo monorepo with two Next.js apps and shared packages.

```
apps/
  classical-guitar-practice/  — Guitar practice tracker (Next.js 15, CSS modules)
  meal-planner/                — Weekly meal planner (Next.js 16, Tailwind + ShadCN)
packages/
  auth/    — Shared password-based auth middleware
  storage/ — Shared S3-compatible storage helpers
  ui/      — Shared UI components (AppShell, AppSwitcher)
```

## Stack

- **Language**: TypeScript
- **Deploy**: Vercel (framework auto-detected; optional `vercel.json` at root)
- **Monorepo**: Turborepo with npm workspaces
- **Shared packages**: `@repo/auth`, `@repo/storage`, `@repo/ui`

## Data

- **S3-compatible object storage** (OVHCloud) stores app data. Required env vars: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`.
- All reads/writes go through `@repo/storage` (`readJson`, `writeJson`, `deleteBlob`) using `@aws-sdk/client-s3` with `forcePathStyle: true`.
- Always call `noStore()` (from `next/cache`) at the top of any layout or server component that reads from storage — `dynamic = "force-dynamic"` alone is not sufficient to bypass Next.js data cache in layouts.

## Password protection

- **`SITE_PASSWORD`** (env var) is required. All routes except `/auth` require authentication.
- Authentication is handled by `@repo/auth` middleware: stored in an `httpOnly` cookie (`site_password`). A `?password=<password>` query param is accepted on any URL — the middleware validates it, sets the cookie, and redirects to strip the param.
- Unauthenticated visits redirect to `/auth?next=<path>`.
- No need to propagate `?password=` across client-side navigations — the cookie handles it.

## Layout (per app)

- `app/` — App Router: `layout.tsx`, `page.tsx`, `globals.css`
- `components/` — App-specific UI components
- `tsconfig.json` — Path alias `@/*` → app root

## Conventions

- Prefer React data bindings and safe URLs.
- No interactive git commands.
- **Always run `npm run build` from the root before committing or pushing** to catch type errors and build failures across all apps.

## Testing

- **Always write new Playwright tests for new features.**
- **Modify existing Playwright tests when modifying an existing feature.**
- **Never delete tests because they don't pass** — fix them instead.

## Commands

| Command                | Purpose                          |
|------------------------|----------------------------------|
| `npm run dev`          | Dev servers for all apps         |
| `npm run build`        | Production build for all apps    |
| `npm run lint`         | Lint all apps                    |

Per-app commands (run from app directory or with `--workspace`):

| Command              | Purpose                                                              |
|----------------------|----------------------------------------------------------------------|
| `npm run dev`        | Local dev server                                                     |
| `npm run build`      | Production build                                                     |
| `npm run start`      | Run production build                                                 |
| `npm run lint`       | Run ESLint                                                           |
| `npm run test`       | Run Vitest unit tests (classical-guitar only)                        |
| `npm run playwright` | Run Playwright e2e tests (classical-guitar only)                     |
