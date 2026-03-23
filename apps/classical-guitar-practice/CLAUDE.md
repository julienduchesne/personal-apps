# Classical Guitar Practice

See [root CLAUDE.md](../../CLAUDE.md) for shared monorepo context.

## Stack

- **Runtime**: Next.js 15 (App Router), React 19
- **Styling**: CSS modules + CSS custom properties (no Tailwind)
- **Lint**: ESLint with `next/core-web-vitals`

## Edit dialogs / modals

All edit and add dialogs use a shared `Modal` component (`components/Modal.tsx` + `components/Modal.module.css`).

- Trigger by navigating to the same page with an `?edit=<id>` (or `?add=1`) search param.
- The server component detects the param, finds the relevant data, and renders `<Modal closePath="/route"><SomeForm /></Modal>`.
- The modal closes by navigating back to `closePath` (with `?password=` preserved).
- Form submit handlers must also preserve the password param when navigating away (use `useSearchParams` and build the path manually, as the custom `Link` component is only for `<a>` elements).
- The `Modal` component wraps its children in `Suspense`, covering any `useSearchParams` calls inside child components.

## Commands

**Always run `npm run test && npm run playwright && npm run build` before committing or pushing.**
