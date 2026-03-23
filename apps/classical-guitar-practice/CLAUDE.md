---
description: How to work with this repo
alwaysApply: true
---

# Classical Guitar Practice — Repo context

## Stack

- **Runtime**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Deploy**: Vercel (framework auto-detected; optional `vercel.json` at root)
- **Lint**: ESLint with `next/core-web-vitals` (`.eslintrc.json`)

## Data

- **S3-compatible object storage** (OVHCloud) stores app data. Required env vars: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`.
- All reads/writes go through `lib/blob.ts` (`readJson`, `writeJson`, `deleteBlob`) using `@aws-sdk/client-s3` with `forcePathStyle: true`.
- Always call `noStore()` (from `next/cache`) at the top of any layout or server component that reads from storage — `dynamic = "force-dynamic"` alone is not sufficient to bypass Next.js data cache in layouts.

## Password protection

- **`SITE_PASSWORD`** (env var) is required. All routes except `/auth` require authentication.
- Authentication is stored in an `httpOnly` cookie (`site_password`). A `?password=<password>` query param is accepted on any URL — the middleware validates it, sets the cookie, and redirects to strip the param.
- Unauthenticated visits redirect to `/auth?next=<path>`.
- No need to propagate `?password=` across client-side navigations — the cookie handles it.

## Layout

- `app/` — App Router: `layout.tsx`, `page.tsx`, `globals.css`
- `components/` — Shared UI (e.g. `Link`, `Modal`)
- `next.config.ts` — Next.js config
- `tsconfig.json` — Path alias `@/*` → repo root
- No README by default; avoid creating one unless asked.

## Conventions

- Prefer React data bindings and safe URLs (see workspace Frontend Security rules).
- Use inline `uv` requirements for any Python scripts.
- No interactive git commands.
- One canonical project doc: **CLAUDE.md** (this file). AGENTS.md and the Cursor rule in `.cursor/rules/` symlink here — edit only this file for repo context.
- **Always run `npm run test && npm run playwright && npm run build` before committing or pushing** to catch type errors, test failures, and build failures early.

## Edit dialogs / modals

All edit and add dialogs use a shared `Modal` component (`components/Modal.tsx` + `components/Modal.module.css`).

- Trigger by navigating to the same page with an `?edit=<id>` (or `?add=1`) search param.
- The server component detects the param, finds the relevant data, and renders `<Modal closePath="/route"><SomeForm /></Modal>`.
- The modal closes by navigating back to `closePath` (with `?password=` preserved).
- Form submit handlers must also preserve the password param when navigating away (use `useSearchParams` and build the path manually, as the custom `Link` component is only for `<a>` elements).
- The `Modal` component wraps its children in `Suspense`, covering any `useSearchParams` calls inside child components.

## Testing

- **Always write new Playwright tests for new features.**
- **Modify existing Playwright tests when modifying an existing feature.**
- **Never delete tests because they don't pass** — fix them instead.

## Commands

| Command              | Purpose                                                              |
|----------------------|----------------------------------------------------------------------|
| `npm run dev`        | Local dev server                                                     |
| `npm run build`      | Production build                                                     |
| `npm run start`      | Run production build                                                 |
| `npm run lint`       | Run ESLint                                                           |
| `npm run test`       | Run Vitest unit tests                                                |
| `npm run playwright` | Run Playwright e2e tests (requires dev server running or starts one) |
