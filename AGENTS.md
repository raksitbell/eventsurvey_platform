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
│   ├── event/                   # workspace/, setup/ (feature components)
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
| `GET /api/event/workspace` | `services/event/workspace.ts` | `users` + `events` + `event_translations` + `roles` + `event_banners` + `event_form_settings` | Current event for owner/sub_user |

Current `dev` mock → portal role map: `system_role=platform_admin` → `super_admin`; active event users whose role permissions contain `manage_sub_user` → `event_owner`; other active event users → `sub_user`. Bind through `core/mock/map-user.ts` and `core/mock/role-permissions.ts`; do not infer roles from custom role labels. Custom role label comes from `users.role_id` → `roles.name`. Event title from `event_translations`; soft-delete via `deleted_at` / `removed_at`.

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

## Figma fidelity and visible copy

- Match the supplied Figma screen, including its Desktop/Mobile layouts, visible text, hierarchy, spacing, and assets. Do not add short explanations, legends, helper captions, labels, badges, or notes that are absent from the design unless the user explicitly requests them. This applies to setup screens and participant previews as well as standalone participant pages.
- User-supplied example assets and reference websites are reference cases only unless explicitly requested as a product feature. Do not add named demo presets, activation query parameters, seeded event content, or demo-specific persistence just from a reference example.
- Keep necessary accessible names and error feedback for real input/storage failures; do not turn implementation details or phase/status explanations into permanent product UI. Report incomplete behavior or demo limitations in the delivery reply instead of adding unsolicited labels to the screen.
- Participant Event Details comes from Desktop `1020:2275` in section `1034:2175` and Mobile `628:804`. Use one shared implementation for the standalone page and both Branding preview viewports; do not maintain a separate approximation for preview.

## Development scope and feature ownership

- Implement only pages, routes, menus, components, and behavior within the assigned scope. A cross-feature link or a neighboring Figma screen does not expand ownership; do not generate unrelated pages or another owner's feature to complete a flow.
- Inspect the current repository first and reuse existing pages, routes, components, and contracts when available and compatible. Do not create duplicate implementations or import another branch's feature solely to provide a navigation destination.
- If an out-of-scope destination is absent from the current branch, leave its integration pending and keep the corresponding action disabled. Do not create placeholder pages or invented routes. Report the missing dependency in the delivery reply and implement it only when the user explicitly expands the scope.

## Component rules

- **One feature, one folder**: new page UI goes in `src/components/<feature>/`, split into focused single-responsibility sub-components — never one monolithic file.
- **Composition over prop drilling**: pass `children`, keep container/state logic separate from presentational components, extract section-level JSX into its own file, and define explicit typed prop interfaces per sub-component.
- **TailAdmin first.** This project is built on the TailAdmin free template (vendored into `src/`, not a package). Pick a component in this order: (1) what already exists under `components/ui|form|common`, (2) **copy it in from [TailAdmin free](https://github.com/TailAdmin/free-nextjs-admin-dashboard) `src/components/`** — it has `ui/alert|badge|avatar|table`, `form/Select|MultiSelect|date-picker|switch`, `form/input/TextArea|Radio|FileInput`, `tables/`, `charts/bar|line`, `common/ComponentCard|ChartTab` that are not vendored yet, (3) compose from TailAdmin primitives, (4) a new package — **ask first**. Adapt whatever you copy to this repo's rules (logical properties, `dark:` variants, translated strings).
- Prefer primitives from `src/components/ui/` and `src/components/form/` over raw HTML or new third-party equivalents.
- **Charts**: `react-apexcharts` must be dynamically imported — `const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })`.
- **Icons**: import Heroicons directly from `@heroicons/react/24/outline`. Use `@/icons` only for local SVG assets such as country flags (SVGs are compiled to React components via `@svgr/webpack`, configured for both webpack and Turbopack).
- Modals use the `useModal` hook (`isOpen`, `openModal`, `closeModal`, `toggleModal`).
- Confirm dialogs go through `useConfirm()` — never `import Swal from "sweetalert2"` in a component. SweetAlert2 is the one approved non-TailAdmin UI dependency (TailAdmin has no confirm-with-promise and no toast, and FR-021 requires toasts); build toasts on it rather than adding a toast library.
- Global state goes through existing contexts (`useAuth`, `useSidebar`, `useTheme`) — don't add new providers without need.

## Event workspace and setup integration

- Keep each feature in its own folder: `components/event/workspace/` for the assigned-event card and assistants, `components/event/setup/` for event details/access/capacity and Branding. Routes compose feature panels; section components receive explicit typed props. Shared inputs stay in `components/form/`; state/loading and draft persistence stay in `hooks/useEventWorkspace.ts` and `hooks/useEventDraft.ts`.
- `/event` is the workspace entry. Its overview link opens `/event/details`; the next step opens `/event/branding`. Keep the details route under `[locale]/(event)/event/`; do not redirect `/event` to a Dashboard or Form Builder route.
- Draft fields/status types live in `types/event/setup.ts`; validation/persistence in `core/event/draft.ts`; access transitions in `core/event/access.ts`. Browser DTOs contain only safe display fields, never raw mock users or credentials. `GET /api/event/workspace` returns JSON `null` for an account with no workspace; clients must distinguish empty data from loading/errors.
- Normalize access after changes **and** when restoring drafts: no Survey means `surveyAccess = null`; Survey without Registration means Direct (`public`); disabling/re-enabling Survey starts at Direct. Registration Required is available only with both forms enabled and must look disabled otherwise. Private/Public is independent of whether a form is enabled; the Figma switch is Off = Public, On = Private.
- Registration Required shares Registration capacity; it does not consume another seat. Direct Survey has its own optional capacity. Persist only positive integer limits or `null` (unlimited).
- Frontend Demo draft changes are stored in browser storage, scoped by user/event/locale. Preserve permission checks and event status when restoring. All setup edits, including published/closed owner demo edits, must persist in LocalStorage only (user instruction). Restore local values for editable Drafts and published/closed owner demos; preserve server lifecycle and permissions, and never send setup changes to the mock server. Do not copy this demo editing exception into production authorization.
- Theme Customization uses one shared `BrandingColorPicker` with a continuous HSV saturation/brightness plane, a full 0–360° Hue range, editable validated six-digit HEX, the native browser color input, and Figma preset palettes. Figma's discrete sample zones are prototype limitations, not implementation constraints. Selections persist immediately to LocalStorage and update Preview; Done/Close dismiss without reverting.
- Event color roles: Primary colors the participant Header and media placeholders; Secondary colors the actual participant content background and Footer at its selected value; Accent colors actions and QR headings. The outer preview mat and portal chrome use fixed system colors, never user-selected branding. `core/event/participant-colors.ts` derives black/white body/header/footer foregrounds and adjusts Accent text against the actual Secondary background to at least 4.5:1 contrast. Preserve event-scoped uploaded logos.
- The latest reusable Preview toolbar (`2155:3459`, screen instances `2158:10875` / `2158:10893`) has transparent identity/actions containers. Keep its parent lavender background continuous; only the Exit action has a white surface.
- Branding uses `types/event/branding.ts`, `core/event/branding.ts`, and `hooks/useEventBranding.ts`; save browser-only Draft colors/media under `eventsurvey:event-branding:v1:<user>:<event>:<locale>`. Validate six-digit hex colors. Logo and Banner share `utils/image-upload.ts`: accept one supported image strictly smaller than 10 MiB, convert to verified WebP with bounded dimensions/quality/output size, then save its data URL (never the original file) in LocalStorage. Support PNG, JPEG, WebP, AVIF, GIF, BMP and SVG when the browser can decode them; animated images become a still frame. Preserve aspect ratio and alpha, release bitmap/object-URL resources, and cancel superseded or dismissed conversions. Preserve existing legacy image values until explicitly replaced. Apply a new image only after a successful local save; surface conversion/quota errors and keep the prior image on failure. Branding banner uses the Figma 3:4 display ratio. `EventSetupSteps` is shared across all four setup pages.
- Published owner demo values use the same validated LocalStorage helpers as Drafts, survive reloads, and stay scoped by user/event/locale. Read-only users must not restore editable setup overrides. Participant QR artwork under `public/images/event-preview/` is Figma sample artwork and must not be treated as live registration/survey links. Keep sample limitations in the delivery reply, without adding a legend to the Figma UI.
- Use `components/form/DateTimePicker.tsx` (TailAdmin/Flatpickr, already installed) for event start/end date-time fields. Use `core/i18n/bangkok-datetime.ts` to convert wall time to/from UTC with Asia/Bangkok (+07:00); never interpret event input in the browser's timezone. Display `DD/MM/YYYY HH:mm`, 24-hour time, and localized calendar labels. Native input formatting and browser locale must not define the event timezone.
- Use “Registration Form” / “Survey Form” in EN and “ฟอร์มลงทะเบียน” / “ฟอร์มแบบสอบถาม” in TH. Keep corresponding nested translation keys in both dictionaries.
- Full Preview state follows Figma Desktop `2030:7849` / Mobile `2030:7928`: keep the 64px Preview toolbar visible, switch devices with the toolbar, and return to its bounded origin: `/event/branding` by default or `/event/publish` with `from=publish`. Scroll only the read-only participant viewport below it. Hide participant floating controls, disable its language action, and render its Login as text inside Full Preview; the preview must never navigate into forms or submit real data. The toolbar notice is supplied Figma copy, not an invented helper.
- Read-only participant preview outlines use a solid border for both Desktop and Mobile, including embedded Preview & Publish and Full Preview from either origin. Keep the Figma Full Preview Mobile instances (`2030:7945`, `2030:8131`) solid without changing their source component or prototype links.
- `components/event/participant/ParticipantEventScreen.tsx` composes the shared participant Header, Content, Footer, and floating display controls. `/preview/event?device=desktop|mobile` renders it outside the portal shell, behind the existing event guard, from local setup values. It is an authenticated owner preview, not a published participant endpoint. `ParticipantPreviewViewport` renders the same screen at the Figma 1440×900 / 390×844 viewport and scales it for Branding; container queries must respond to the preview width. Keep form/QR navigation and privacy-policy content for their actual implementation phase rather than adding explanatory dialogs or invented routes.
- Run `node --test tests/event-setup.cjs` for access-state, draft isolation/persistence, capacity, date-time, and translation regressions. Use the existing TypeScript transpiler and Node test runner; do not add a test library for these pure helpers.
- Workspace Overview form badges reflect the saved `hasRegistration` / `hasSurvey` setup flags, not form publication readiness. `useEventWorkspace` restores the current user's event/locale draft and immutable publication through `core/event/workspace.ts` and subscribes to successful same-tab setup saves plus scoped cross-tab storage changes. Invalid/failed saves must not alter Overview; local publication takes precedence over later draft values, and server lifecycle/permissions remain unchanged.
- Event Details (`571:1192`) groups Back and Next · Branding at the bottom inline-end, in that order. Both actions must successfully save the current draft to LocalStorage before navigating; form submission follows Next. Keep inline storage/validation errors above the action group without moving either button. A local setup save does not change the event or form lifecycle to Open.
- All four setup steps use `EventSetupActions` for the bottom inline-end Back + primary action group; Branding (`571:1193`), Form Setup (`1255:3124`) and Publish (`626:757`) follow the same save-before-navigation contract as Details. Branding saves both details and branding and displays either save failure; Publish also saves before entering Full Preview, blocks navigation while publishing, and creates its immutable local receipt only after validation and confirmation. Keep recovery feedback/retry controls above the group so the two main buttons retain their order and alignment. Do not add a Dashboard route for the Figma publish label.
- Setup page components wrap their loaded UI with `EventSetupBoundary` in the same file; avoid separate panels that duplicate loading/error/empty handling. Reuse `EventSetupPageProps`, `createSavedNavigation` from `core/event/draft.ts`, and `selectSetupForms` for common setup contracts. Keep Draft and Branding persistence separate because their failure behavior differs.
- Keep the four setup page containers and shared page structure (`EventSetupBoundary`, `EventSetupSteps`, `EventSetupActions`) at `components/event/setup/` root. Place step-specific UI one level below in `details/`, `branding/`, `forms/`, and `publish/`. Event Access and Capacity belong directly in `details/`; avoid deeper folders until a feature has several independently reusable components. Participant screen implementations remain in `components/event/participant/`.
- The Overview lifecycle badge uses `eventWorkspaceDisplayStatus`: a validated, unpublished local setup displays Draft (matching Figma `844:1413`), with `hasLocalDraft` as browser-only metadata. Preserve the BFF `eventStatus` for permissions/lifecycle; never overwrite it merely to change the badge. Without a local draft, or after a local publication receipt, show the assigned event's existing status. Form availability remains its separate มี/ไม่มี state.

### Raksit setup scope

- Raksit owns Event Details, Branding, Form Setup (`1255:3124`), Preview & Publish (`626:757`), Whitelist Management (`1327:2631`) and import dialogs, participant Event preview and their related dialogs/components (Whitelist explicitly assigned by the user). Do not import Form Builder/Form Management or Dashboard pages from other branches just to make cross-feature links work.
- Keep the Figma Whitelist action in Event Details when Private and Registration Form are both enabled. When Registration is off, show the supplied enable-registration hint instead; Public hides both. The user has now assigned Whitelist to Raksit: link this action to `/event/whitelist`, preserving a successful local details save before navigating. Do not apply the former disabled-placeholder rule to this implemented destination.
- Whitelist uses `components/event/whitelist/`, `types/event/whitelist.ts`, `core/event/whitelist.ts`, and `useEventWhitelist`. Keep canonical Figma screen `1327:2631`, its import overlays (`1327:2775`, `1850:5227`, `1850:5228`) and existing component families owned by `@raksitbell`; preserve their IDs and prototype links.
- Whitelist edits remain local under `eventsurvey:event-whitelist:v1:<user>:<event>:<locale>`. Manual entry and file-column preview stage changes; only Save replaces the active local list. Cancel discards the dialog draft; warn before leaving unsaved list changes. CSV parsing is enabled; XLSX remains pending explicit approval to add a reader package. Uploaded files and import history are never stored. Retain used entries for references and never re-grant their IDs during replacement.
- The supplied Whitelist prototype uses Email: trim and compare case-insensitively, reject malformed/duplicate IDs, and exclude invalid import rows. This is an explicit local prototype contract, not verified Registration Unique Field metadata. Do not clear publication's Unique Field/Whitelist integration checks merely because this local prototype list exists. Future integration must read the configured Registration Unique Field and support its actual type.
- `canManageWhitelist` is a read-only workspace DTO permission derived from `manage_registration_form`. Local list edits require this permission, Private + Registration enabled, and an editable local lifecycle; local publication locks them. Do not infer Whitelist management permission from `manage_event` alone.
- `/event/forms` shows read-only form summaries from the existing BFF via `useEventFormSummaries`. Its “Open Form Builder” buttons stay disabled while the Form team's routes are absent from this branch. Do not add `/form/*` pages or a Form sidebar menu for this scope.
- `/event/publish` uses the shared participant preview and a whitelisted `from=publish` return path. Publication is a browser-only immutable snapshot under `eventsurvey:event-publication:v1:<user>:<event>:<locale>`, with no BFF mutation. A local publication locks setup edits and restores its saved branding/content without rewriting server lifecycle status.
- Follow the SRS: zero forms is allowed. Validate enabled form content, survey schedule and applicable capacity. This branch does not expose Unique Field/Whitelist readiness; block dependent publication with real feedback until the owning feature is integrated. Never assume those checks passed.
- Publish confirmations/errors/success use the additive `appearance: "event"` options in `useConfirm`; keep default confirmation styling unchanged. The Figma success action closes the prototype dialog; do not create an out-of-scope Dashboard route.

### Published branch integration snapshot (9 November 2026)

- Reviewed `origin/dev`, `origin/main`, `origin/feature/form-builder`, and `origin/feature/dashboard`; feature branch refs are compatibility evidence, not permission to replace current `dev` contracts.
- Form Builder adds `/form`, `/form/registration`, `/form/survey` and feature components under `components/event/form/`. Preserve these routes/components and its `form` translation namespace when integrating; workspace/setup use `eventHome`. Its lifecycle changes must be reconciled with the current BFF rather than duplicated in components.
- Dashboard already uses `components/event/workspace/EventWorkspacePanel.tsx`; keep one canonical implementation at that path when merging. It also changes `/event` page imports, `services/event/workspace.ts`, `types/event/workspace.ts`, globals and translations: resolve these explicitly, preserving the current card, empty/error states, and details navigation.
- Dashboard's published service binds access with `services/auth/access.ts` and uses `starts_at`/`ends_at`, `eventStartsAt`/`eventEndsAt`, and a different mock lifecycle. Current `dev` uses role permissions, `start_at`/`end_at`, `startsAt`/`endsAt`, and mock `draft/scheduled/open/closed`. These are **not** interchangeable schemas; a combined release needs an explicit service/type/auth reconciliation and both feature test suites. Do not claim a clean merge or full runtime compatibility from an isolated build.
- Merge simulation at setup commit `c369c31` (`git merge-tree --write-tree --name-only`, no working-tree merge): `origin/dev` and `origin/main` have no textual conflicts. Form Builder has conflicts in the two message dictionaries plus `api/event/forms/[id]/status/route.ts`, `services/admin/overview.ts`, `services/event/forms.ts`, and `types/mock.ts`. Dashboard has conflicts in `.gitignore`, globals, the canonical Workspace panel, role mapping, the two message dictionaries, workspace service, and mock types. A clean textual merge alone does not prove runtime compatibility.
- `main` is behind the current `dev` event work. Keep `dev`'s existing invite/mail dependencies; do not remove `nodemailer` or its types just because older feature branches omit them.
- Follow the published Dashboard's static-analysis conventions in new components: explicit React type imports, `globalThis.document`/`globalThis.localStorage` for browser APIs, no duplicate object properties, and imports only from actual exported symbols. Shared primitives must remain additive; avoid changing defaults used by other features.

## Don'ts

- Call a change request a **Pull Request (PR)**, never a Merge Request or MR — MR is GitLab's term for the same thing, and this project is on GitHub. Reference one as `#12` or `owner/repo#12`.
- When asked to commit, create a local commit only. Never run `git push` or create, update, reopen, merge, or close a PR; the user alone performs all remote Git and GitHub actions.
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
