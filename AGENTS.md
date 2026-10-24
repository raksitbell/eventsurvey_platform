# AGENTS.md — EventSurvey

> Event & Survey management frontend · Next.js 16 · Tailwind CSS v4 · next-intl · role-based `/admin` + `/event`

## Repo Map

> Route groups `(name)/` are Next.js App Router organizational folders —
> they don't affect the URL path. Explore subfolders directly; this map
> stops at the level needed to orient, not to enumerate.

```
src/
├── app/                         # routes (Next.js App Router)
│   ├── [locale]/                # localized routes (next-intl)
│   │   ├── (auth)/              # full-width auth shell (no sidebar)
│   │   │   └── login/           # /login
│   │   ├── (admin)/             # dashboard shell (sidebar+header)
│   │   │   └── admin/           # /admin, /admin/users
│   │   ├── (event)/             # dashboard shell (sidebar+header)
│   │   │   └── event/           # /event
│   │   ├── page.tsx             # / → redirect by auth role
│   │   ├── layout.tsx, not-found.tsx
│   ├── api/                     # Next.js BFF route handlers only
│   │   ├── auth/login/route.ts
│   │   ├── admin/               # users, users/[id], overview routes
│   │   └── event/workspace/     # current event for owner/sub_user
│   ├── [locale]/(error)/error/  # TailAdmin-style 403/404/500/503 pages
│   ├── favicon.ico, globals.css
├── components/
│   ├── admin/                   # PlatformOverview, UsersTable, charts
│   ├── auth/                    # LoginForm, AuthGuard, ImpersonationBanner
│   ├── ui/                      # primitives: button, dropdown…
│   ├── form/                    # Label + input/
│   ├── common/                  # LanguageSwitcher, ThemeToggle, breadcrumb…
│   └── header/                  # UserDropdown
├── core/                        # shared non-UI helpers
│   ├── api/                     # app client (/api) + mock client (server)
│   └── auth/                    # session, permissions, client auth helpers
├── services/                    # data binding by area (peer of types/)
│   ├── admin/                   # users.ts, overview.ts
│   ├── auth/                    # login.ts
│   └── event/                   # workspace.ts
├── types/                       # shared types by area (peer of services/)
│   ├── admin/                   # users.ts, overview.ts
│   ├── event/                   # workspace.ts
│   └── auth.ts, user.ts, mock.ts
├── i18n/                        # routing.ts, request.ts, navigation.ts, languages.ts
├── messages/                    # th.json, en.json
├── layout/                      # AppSidebar, AppHeader, Backdrop
├── context/                     # AuthContext, SidebarContext, ThemeContext
├── hooks/                       # useModal, useGoBack, useClickOutside
├── icons/                       # .svg + index.tsx barrel (SVGR)
├── lib/                         # thin re-exports (prefer @/core, @/types/user)
├── proxy.ts                     # next-intl routing middleware
└── utils/
```

## Stack

- **Next.js 16** (App Router, Turbopack + webpack both configured) with **React 19** and strict **TypeScript**.
- **next-intl v4** for internationalization (i18n); locales: `th` (default), `en`; `localePrefix: "never"`.
- Mock API base URL (server): `MOCK_API_BASE_URL` (fallback `NEXT_PUBLIC_API_BASE_URL`).
- Frontend calls **own** BFF routes under `/api/*`; Route Handlers fetch + bind mock resources.
- Path alias: `@/*` → `src/*`. Prefer `@/core/*`, `@/services/<area>/…`, `@/types/<area>/…`, `@/components/*`. Import the concrete file — no barrel `index.ts` re-exports for services/types.
- Scripts: `npm run dev`, `npm run build`, `npm run lint`. Node >= 20.9.
- This Next.js version may differ from your training data — read the relevant guide in `node_modules/next/dist/docs/` before writing code and heed deprecation notices.

## BFF / data binding

| App route | Service | Mock resources joined | Purpose |
|---|---|---|---|
| `POST /api/auth/login` | `services/auth/login.ts` | `users` | Portal login (`email` + `password`) |
| `GET /api/admin/users` | `services/admin/users.ts` | `users` + `events` + `event_translations` + `roles` | Admin users table |
| `GET /api/admin/users/[id]` | `services/admin/users.ts` | `users` | Impersonation payload |
| `GET /api/admin/overview` | `services/admin/overview.ts` | `users` + `events` + `forms` + `form_submissions` | Platform KPIs |
| `GET /api/event/workspace` | `services/event/workspace.ts` | `users` + `events` + `event_translations` + `roles` | Current event for owner/sub_user |

Mock → portal role map: `platform_admin` → `super_admin`; `event_role=event_admin` → `event_owner`; `event_role=event_sub_user` → `sub_user`. Custom role label comes from `users.role_id` → `roles.name`. Event title from `event_translations`; soft-delete via `deleted_at` / `removed_at`.

- `services/` and `types/` are peers under `src/`, split by area/page (`admin/users`, `admin/overview`, `auth/login`).
- Import directly from the file path (e.g. `@/services/admin/users`, `@/types/admin/users`) — do not add barrel `index.ts` files that re-export everything.
- Data binding lives in `src/services/<area>/*.ts`, not in `core/`, `app/api/`, or React components. Route handlers only call services + return JSON.
- Browser uses `api` from `@/core/api` → `/api/...` only. Server services use `mockApi` → mock JSON Server.

## Auth & permissions

| Role | Access |
|---|---|
| `super_admin` | `/admin/*` only (unless impersonating) |
| `event_owner` | `/event/*` |
| `sub_user` | `/event/*` |
| `participant` | portal login blocked |

- Login: `core/auth/service.ts` → `POST /api/auth/login` (BFF → mock `GET /users?...`)
- Session stored in `localStorage` via `core/auth/session.ts`
- Impersonation: only `super_admin` from `/admin/users`; effective user enters `/event`
- Route guards: `components/auth/AuthGuard.tsx` + `AuthContext`

## Conventions

- **New page** → add under the matching group:
  - Auth (no chrome): `src/app/[locale]/(auth)/…`
  - Super admin: `src/app/[locale]/(admin)/admin/…`
  - Event workspace: `src/app/[locale]/(event)/event/…`
  - Never place pages outside `[locale]`.
- **New domain logic / types** → `src/core/<domain>/` and `src/types/` (keep UI out of `core/`).
- **New reusable component** → `components/<feature>/` if domain-specific (`admin`, `auth`, …), else `components/common/` or `components/ui/`.
- **New icon** → drop the `.svg` in `icons/`, export it from the `index.tsx` barrel with a PascalCase name. Never inline SVG markup in components.
- Route groups: `(admin)` and `(event)` share the dashboard shell; `(auth)` is full-width without sidebar/header.
- Component files are **PascalCase** (`UsersTable.tsx`) with a **default export**; route files stay lowercase (`page.tsx`, `layout.tsx`); hooks are camelCase (`useModal.ts`).
- Root `app/[locale]/layout.tsx` is a Server Component setting up `NextIntlClientProvider`, fonts, direction, and providers (`AuthProvider`, `ThemeProvider`, `SidebarProvider`). Interactive shell layouts are Client Components — add `"use client"` whenever using hooks, event handlers, or browser APIs.
- Import via the alias (`@/core/...`, `@/services/admin/users`, `@/types/user`, `@/context/...`, `@/icons/...`, `@/i18n/...`) for cross-folder imports; relative imports are fine within a feature folder.

## Internationalization (next-intl) rules

- **Navigation & Routing**: Always import navigation primitives (`Link`, `useRouter`, `usePathname`, `redirect`) from `@/i18n/navigation`, never directly from `next/link` or `next/navigation`.
- **Routing Configuration**: Locales (`th`, `en`) and routing settings are centralized in `src/i18n/routing.ts` (`localePrefix: "never"`, `defaultLocale: "th"`).
- **Translations**:
  - In Client Components: use `useTranslations("namespace")`.
  - In Server Components: use `getTranslations("namespace")` from `next-intl/server`.
  - Organize translation keys by nested feature namespaces (e.g. `auth`, `adminHome`, `adminUsers`, `sidebar`).
- **Translation Messages**: All translation dictionaries live in `src/messages/<locale>.json` (`th.json`, `en.json`). When adding or updating user-facing copy, maintain corresponding keys across **all** supported language files.
- **Static Rendering & Server Components**: Static rendering with `generateStaticParams()` works through `next/root-params` — server layouts/pages inside `[locale]` need no per-page locale call. (This previously required `setRequestLocale(locale)`, which next-intl has deprecated.)
- **Language switcher**: `components/common/LanguageSwitcher.tsx` (used on login; user dropdown also switches locale).
- **RTL Support**: Keep CSS logical properties so future RTL locales work; use `isRtl(locale)` in `src/i18n/languages.ts` when adding RTL languages.

## Styling rules

- Tailwind CSS **v4** — the theme lives in `src/app/globals.css` under `@theme`; there is no `tailwind.config`.
- Always use theme tokens instead of hardcoded values:
  - Colors: `brand`, `gray`, `blue-light`, `orange`, `success`, `error`, `warning` scales (`25`–`950`), plus `theme-pink-500` / `theme-purple-500`.
  - Typography: `font-outfit`, `text-theme-xs/sm/xl`, `text-title-sm/md/lg/xl/2xl`.
  - Shadows: `shadow-theme-xs/sm/md/lg/xl`, `shadow-focus-ring`, `shadow-slider-navigation`, `shadow-tooltip`, `shadow-datepicker`.
  - Breakpoints: custom `2xsm` (375px), `xsm` (425px), `3xl` (2000px) alongside the defaults.
  - Z-index: `z-1`, `z-9`, `z-99`, … `z-999999` tokens.
- **Dark mode is class-based** (`@custom-variant dark (&:is(.dark *))`, driven by `ThemeContext` with light/dark/auto). Every styled element must include its `dark:` variant.
- **CSS Logical Properties for RTL & Internationalization**:
  - Never use physical directional utilities when logical equivalents exist; physical `left`/`right` properties break in RTL layout:
    - **Margins**: Use `ms-*` / `me-*` (margin-inline start/end) instead of `ml-*` / `mr-*`.
    - **Padding**: Use `ps-*` / `pe-*` (padding-inline start/end) instead of `pl-*` / `pr-*`.
    - **Positioning / Insets**: Use `start-*` / `end-*` instead of `left-*` / `right-*`.
    - **Borders**: Use `border-s-*` / `border-e-*` instead of `border-l-*` / `border-r-*`.
    - **Border Radius**: Use `rounded-s-*` / `rounded-e-*` / `rounded-ss-*` / `rounded-se-*` / `rounded-es-*` / `rounded-ee-*` instead of `rounded-l-*` / `rounded-r-*` / `rounded-t-*` corner combos.
    - **Text Alignment**: Use `text-start` / `text-end` instead of `text-left` / `text-right`.
  - **Directional Icons & Transforms**:
    - Directional glyphs (e.g. back/forward arrows, breadcrumb chevrons, next/prev icons) must flip in RTL with `rtl:rotate-180` or `rtl:-scale-x-100`.
    - Off-canvas drawers and sliding elements must mirror their translation (e.g., `-translate-x-full rtl:translate-x-full`).
    - Use `ltr:*` and `rtl:*` modifiers when explicit directional overrides or third-party integration styles are required.
- Reusable `@utility` classes already exist in `globals.css` (`menu-item-*`, `menu-dropdown-*`, `custom-scrollbar`, `no-scrollbar`, …) — reuse them before inventing new ones.
- Third-party CSS overrides (ApexCharts, etc.) live at the bottom of `globals.css`. Add overrides there, matching the existing `@apply` style.
- Never hardcode hex colors in `className`. (Chart option objects like `ApexOptions.colors` are the established exception — copy hex values from the `@theme` palette, e.g. `#465fff` = brand-500.)

## Component rules

- **One feature, one folder**: new page UI goes in `src/components/<feature>/`, split into focused single-responsibility sub-components — never one monolithic file.
- **Composition over prop drilling**: pass `children`, keep container/state logic separate from presentational components, extract section-level JSX into its own file, and define explicit typed prop interfaces per sub-component.
- **TailAdmin first.** This project is built on the TailAdmin free template (vendored into `src/`, not a package). Pick a component in this order: (1) what already exists under `components/ui|form|common`, (2) **copy it in from [TailAdmin free](https://github.com/TailAdmin/free-nextjs-admin-dashboard) `src/components/`** — it has `ui/alert|badge|avatar|table`, `form/Select|MultiSelect|date-picker|switch`, `form/input/TextArea|Radio|FileInput`, `tables/`, `charts/bar|line`, `common/ComponentCard|ChartTab` that are not vendored yet, (3) compose from TailAdmin primitives, (4) a new package — **ask first**. Adapt whatever you copy to this repo's rules (logical properties, `dark:` variants, translated strings).
- Prefer primitives from `src/components/ui/` and `src/components/form/` over raw HTML or new third-party equivalents.
- **Charts**: `react-apexcharts` must be dynamically imported — `const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })`.
- **Icons**: import from `@/icons` (SVGs are compiled to React components via `@svgr/webpack`, configured for both webpack and Turbopack).
- Modals use the `useModal` hook (`isOpen`, `openModal`, `closeModal`, `toggleModal`).
- Confirm dialogs go through `useConfirm()` — never `import Swal from "sweetalert2"` in a component. SweetAlert2 is the one approved non-TailAdmin UI dependency (TailAdmin has no confirm-with-promise and no toast, and FR-021 requires toasts); build toasts on it rather than adding a toast library.
- Global state goes through existing contexts (`useAuth`, `useSidebar`, `useTheme`) — don't add new providers without need.

## Don'ts

- Call a change request a **Pull Request (PR)**, never a Merge Request or MR — MR is GitLab's term for the same thing, and this project is on GitHub. Reference one as `#12` or `owner/repo#12`.
- Don't install new packages without asking the user — TailAdmin usually already ships the component. Five template packages are installed but unused (`@fullcalendar/react`, `@react-jvectormap/core`, `@react-jvectormap/world`, `simplebar-react`, `react-dropzone`); don't remove them without asking either.
- Don't hand-roll a component that TailAdmin free already ships — copy theirs in and adapt it instead.
- Don't import `Link`, `useRouter`, `usePathname`, or `redirect` from `next/link` or `next/navigation` — always use `@/i18n/navigation`.
- Don't create pages directly under `src/app/` outside the `[locale]` segment.
- Don't put React components or UI inside `src/core/` — keep core pure logic/types consumers.
- Don't nest `services/` under `app/api/` — keep `src/services/` as a peer of `src/types/`, split by area/page.
- Don't add barrel `index.ts` re-exports under `services/` or `types/` — callers import the concrete path.
- Don't hardcode user-facing text without adding keys to `src/messages/th.json` **and** `src/messages/en.json`.
- Don't use physical directional utilities (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `border-l-*`, `border-r-*`, `rounded-l-*`, `rounded-r-*`, `text-left`, `text-right`) — always use CSS logical equivalents (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `border-s-*`, `border-e-*`, `rounded-s-*`, `rounded-e-*`, `text-start`, `text-end`).
- Don't hardcode hex colors or pixel values in `className` — use the `@theme` tokens.
- Don't create a `tailwind.config` — Tailwind v4 is configured through `globals.css`.
- Don't import `react-apexcharts` statically — always use `next/dynamic` with `ssr: false` (unless already wrapped in a client-only boundary).
- Wrong-area navigation → render `ErrorPage` 403 **in place** inside `AuthGuard` (do not soft-navigate; it hangs on Loading...).
- Auth transitions (login / logout / impersonate / stop) use `softGo()` / `router.replace()` from `AuthContext`, which holds the UI until the target renders. There is no `hardRedirect()`.
- Keep TailAdmin error demos at `/error/403`, `/error/404`, `/error/500`, `/error/503`.
- Unknown paths (e.g. `/asdf`, `/events`, `/administrator`) must hit `src/app/[locale]/[...rest]/page.tsx`, which renders `ErrorPage` 404 **in place** — do not call `notFound()`, it hangs with Router-before-init / CatchAll errors. The page renders with HTTP 200; only the in-app 404 screen is guaranteed.
- Guarded areas in `src/proxy.ts` are matched with `isArea()` (exact segment), never `startsWith()` — a prefix match swallows `/events`, `/administrator` and `/eventual`, which must fall through to the catch-all instead.
- Don't call `setRequestLocale()` in pages or layouts, and don't use `requestLocale` in `src/i18n/request.ts` — both are deprecated in next-intl. The locale comes from `next/root-params` (`locale()`), which reads the `[locale]` segment directly. next-intl's own docs and tutorials still show `setRequestLocale`; ignore them here.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
