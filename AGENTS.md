# AGENTS.md — EventSurvey

Event and survey management frontend. Next.js 16 App Router (Turbopack and webpack), React 19, strict TypeScript, Tailwind CSS v4, and next-intl v4. Node >= 20.9. Use `npm run dev`, `npm run build`, and `npm run lint`.

## Code review

- Write findings in clear, concise Thai by default. Keep severity labels, paths, symbols, and error codes in their original form.
- For each finding, give the reproducible trigger, user or system impact, and smallest safe correction or verification.

## Repo map and architecture

Paths below are relative to `src/` unless stated otherwise. `@/*` maps to `src/*`. Use aliases for cross-folder imports and relative paths within a feature. Import concrete files from `services/` and `types/`. Keep these peer folders split by area/page, without barrel re-exports.

| Location | Responsibility |
| --- | --- |
| `app/[locale]/(auth)/` | Full-width auth routes without dashboard chrome, including `/login` |
| `app/[locale]/(admin)/admin/` and `app/[locale]/(event)/event/` | Role-specific pages with dashboard sidebar and header |
| `app/[locale]/page.tsx` and `app/[locale]/(error)/error/` | Role-based home redirect and TailAdmin error routes |
| `app/api/`, `services/<area>/`, `core/api/` | BFF handlers, service data binding, and browser/server API clients |
| `components/<feature>/` and `components/ui`, `form`, `common` | Feature UI and shared primitives |
| `core/<domain>/`, `types/`, `hooks/`, `utils/` | Shared non-UI logic, contracts, hooks, and utilities |
| `i18n/`, `messages/`, `proxy.ts` | Locale configuration and navigation, dictionaries, and routing middleware |
| `layout/`, `context/`, `icons/` | Portal chrome, global state, and local SVGs |

- Put pages in the matching group under `app/[locale]/`. Route groups do not change URLs. Keep route filenames lowercase, components PascalCase with a default export, and hooks camelCase.
- `app/[locale]/layout.tsx` is a Server Component that sets up `NextIntlClientProvider`, fonts, direction, and `AuthProvider`, `ThemeProvider`, and `SidebarProvider`. Use `"use client"` for interactive shells and components using client hooks, events, or browser APIs.
- Keep UI out of `core/`. Prefer `@/core/*` and `@/types/user` over legacy `lib/` re-exports.

### BFF and mock data

- Browser requests use `api` from `@/core/api` for EventSurvey's `/api/*`. Server services use `mockApi` for JSON Server at `MOCK_API_BASE_URL`, falling back to `NEXT_PUBLIC_API_BASE_URL`. Route handlers may enforce auth and validate requests, then call services and return JSON. Join and bind resources in `services/<area>/`. Browser DTOs expose safe display fields only.

| BFF route | Service | Mock resources |
| --- | --- | --- |
| `POST /api/auth/login` | `services/auth/login.ts` | `users` |
| `GET /api/admin/users` | `services/admin/users.ts` | `users`, `events`, `event_translations`, `roles` |
| `GET /api/admin/users/[id]` | `services/admin/users.ts` | `users` for impersonation |
| `GET /api/admin/overview` | `services/admin/overview.ts` | `users`, `events`, `forms`, `form_submissions` |
| `GET /api/event/workspace` | `services/event/workspace.ts` | `users`, `events`, `event_translations`, `roles`, `event_banners`, `event_form_settings` |

- Use `core/mock/map-user.ts` and `core/mock/role-permissions.ts` for role mapping. `system_role=platform_admin` maps to `super_admin`. Active event users with `manage_sub_user` map to `event_owner` and other active event users to `sub_user`. Custom labels come from `users.role_id` → `roles.name` and never determine access. Read event titles from `event_translations` and respect `deleted_at` / `removed_at`.

### Auth and routing

- `super_admin` uses `/admin/*` unless impersonating. `event_owner` and `sub_user` use `/event/*`. Block portal login for `participant`.
- `core/auth/service.ts` sends email and password to `POST /api/auth/login`, backed by mock `GET /users`. `core/auth/cookie.ts` issues a signed, expiring HttpOnly cookie using `AUTH_SESSION_SECRET`. Hydrate browser state through `GET /api/auth/session`. Protected BFF handlers verify the cookie and the current account and role before serving protected data.
- `/api/auth/impersonation` verifies the real `super_admin` has `impersonate_event_user` and validates the effective event account. Keep these identities separate.
- Route guards use `components/auth/AuthGuard.tsx` and `AuthContext`. Render `ErrorPage` 403 in place inside `AuthGuard` for wrong-area navigation. Login, logout, and impersonation transitions use `softGo()` / `router.replace()` from `AuthContext`, which holds the UI until the target renders.
- Use `isArea()` for exact segment matching in `proxy.ts`. Paths such as `/events`, `/administrator`, and `/eventual` must reach `app/[locale]/[...rest]/page.tsx`, which renders `ErrorPage` 404 in place with HTTP 200. Calling `notFound()` there can hang with Router-before-init/CatchAll errors. Keep `/error/403`, `/error/404`, `/error/500`, and `/error/503`.

## Internationalization

- Import `Link`, `useRouter`, `usePathname`, and `redirect` from `@/i18n/navigation`. `i18n/routing.ts` defines `th` (default), `en`, and `localePrefix: "never"`. `components/common/LanguageSwitcher.tsx` and the user dropdown expose locale switching.
- Use `useTranslations("namespace")` in Client Components and `getTranslations("namespace")` from `next-intl/server` in Server Components. Use feature namespaces and update matching keys in `messages/th.json` and `messages/en.json` for every user-facing change.
- Static rendering with `generateStaticParams()` uses `locale()` from `next/root-params`. Avoid `setRequestLocale()` in pages/layouts and `requestLocale` in `i18n/request.ts`. Use `isRtl(locale)` in `i18n/languages.ts` when adding RTL locales.

## UI and styling

- Build feature UI in `components/<feature>/`. Compose focused sections with explicit typed props and `children` where useful. Separate state and orchestration from presentation. Use `ui/`, `form/`, or `common/` for shared components.
- Use existing TailAdmin primitives first. Next, copy and adapt from [TailAdmin free](https://github.com/TailAdmin/free-nextjs-admin-dashboard) `src/components/`. Compose from its primitives when a ready-made component is unavailable. Adapt logical properties, dark variants, and translations. Ask before adding packages or removing these template dependencies: `@fullcalendar/react`, `@react-jvectormap/core`, `@react-jvectormap/world`, `simplebar-react`, and `react-dropzone`.
- Use `useModal` for modals, `useConfirm()` for confirms, and existing SweetAlert2 helpers for FR-021 toasts. Avoid direct SweetAlert2 imports in components and additional toast libraries. Use the existing `useAuth`, `useSidebar`, and `useTheme` contexts for global state.
- Load `react-apexcharts` with `next/dynamic` and `ssr: false` unless it already has a client-only boundary. Use Heroicons from `@heroicons/react/24/outline`. For local SVG assets, add the file to `icons/` and a PascalCase export to `icons/index.tsx`. SVGR handles both bundlers. Avoid inline SVG markup.
- Use `@theme` in `app/globals.css` for colors, typography, spacing, shadows, breakpoints, and z-index. Use tokens instead of literal hex or pixel values in `className`. ApexCharts option objects can copy hex values from the palette. Reuse utilities such as `menu-item-*`, `menu-dropdown-*`, `custom-scrollbar`, and `no-scrollbar`. Keep third-party overrides with `@apply` at the bottom of `globals.css`. Tailwind v4 has no `tailwind.config`.
- Common tokens include `brand`, `gray`, `blue-light`, `orange`, `success`, `error`, `warning`, `theme-pink-500`, `theme-purple-500`, `font-outfit`, `text-theme-*`, `text-title-*`, and `shadow-theme-*`. Custom breakpoints are `2xsm` (375px), `xsm` (425px), and `3xl` (2000px).
- Apply class-based `dark:` variants to styled elements. `ThemeContext` supports light, dark, and auto.
- Use logical utilities `ms/me`, `ps/pe`, `start/end`, `border-s/e`, `rounded-s/e/ss/se/es/ee`, and `text-start/end`. Mirror directional icons and off-canvas translations in RTL. Use `ltr:*` and `rtl:*` for directional overrides.
- For participant EventDisplay, read [DESIGN.md](DESIGN.md) and verify live Figma and approved SRS before implementation. Its suggested tokens and components are design guidance. Keep EventDisplay typography scoped to its intended viewports.

### Figma fidelity and feature ownership

- Match supplied Desktop/Mobile layouts, hierarchy, spacing, assets, and visible copy. Keep accessible names and real input/storage errors. Add explanatory copy, legends, labels, badges, or hints only when supplied or requested. Report limitations in the handoff.
- Treat example assets and websites as references. Add demo presets, activation query parameters, seeded content, or demo persistence only on explicit request.
- Implement assigned scope only. Inspect the current branch and reuse compatible routes, components, and contracts. A neighboring screen or link does not expand ownership. Keep actions for absent out-of-scope destinations disabled, report the missing dependency, and avoid placeholders, invented routes, or importing another team's branch for navigation.

## Code quality and Git

- Use `globalThis` for browser globals in Client Components and import React types explicitly (`TypeScriptUMDGlobal`). Import symbols that the module actually exports (TS2305/TS2724). Extend shared primitives additively and keep existing defaults stable.
- Use early returns, `continue`, or `break` for local control flow (`ExceptionCaughtLocallyJS`). Use bare typed booleans or `!value`, avoid duplicate object keys, and check deprecations (`JSDeprecatedSymbols`). Use `z.iso.datetime()` in Zod v4 and `event.preventDefault()` for `beforeunload`.
- Make, verify, and commit changes locally on the agreed feature branch. Only the user performs remote Git and GitHub actions, including push and opening, updating, reopening, merging, or closing PRs.
- Use **Pull Request (PR)**, referenced as `#12` or `owner/repo#12`. Deliver via a feature-branch PR targeting the agreed base and merge on GitHub after review. Keep the local target free of feature commits. Use `git merge-tree` or an isolated worktree for compatibility checks.

## Event workspace and setup

Raksit owns Event Details, Branding, Form Setup, Preview & Publish, Whitelist Management, and participant Event preview, including their dialogs and components. Reuse integrated Form Builder/Form Management and Dashboard contracts within this scope.

### Structure and saving

- `/event` is the workspace entry. The Overview opens `/event/details` and the Figma setup flow continues to Branding. Keep the workspace entry separate from Dashboard and Form Builder. Workspace UI is in `components/event/workspace/`, including the assigned-event card and assistants. Use `hooks/useEventWorkspace.ts` and distinguish the workspace API's JSON `null` from loading or an error.
- Keep the four page containers plus `EventSetupBoundary`, `EventSetupSteps`, and `EventSetupActions` at `components/event/setup/` root. Organize step UI directly in `details/`, `branding/`, `forms/`, and `publish/`. Access and Capacity belong directly in `details/`. Use deeper folders only when several components are independently reusable. Shared inputs belong in `components/form/`.
- Wrap each loaded setup page with `EventSetupBoundary` in its own file. Reuse `EventSetupPageProps`, `createSavedNavigation` from `core/event/draft.ts`, and `selectSetupForms`. Use `types/event/setup.ts` for draft fields/status, `core/event/draft.ts` for validation/persistence, `core/event/access.ts` for access transitions, and `hooks/useEventDraft.ts` for state. Keep Draft and Branding persistence separate for their different failure modes.
- Save authenticated, revisioned drafts by event. Save Draft preserves event and form lifecycle. Import LocalStorage v1/v2 only from the original browser and after confirmation. Keep old keys until a server read verifies the import. Restore each translation and prefer the event default for shared settings. Treat old browser publication receipts as private recovery data.
- Use `EventSetupActions` for bottom inline-end Back then primary on all four steps. Save successfully through the API before navigation. Details Figma `571:1192` places Back before Next · Branding and submits through Next. Branding `571:1193` saves Details and Branding and surfaces either failure. Form Setup `1255:3124` and Publish `626:757` share the save contract. Keep errors, recovery, and retry above the buttons. Publish also saves before Full Preview and blocks navigation while publishing.
- Workspace Overview reads saved setup from the BFF and refreshes after same-tab and cross-tab saves. Invalid or failed saves must leave Overview on the last saved data. A published server snapshot takes precedence. Use the applicable BFF/snapshot lifecycle for the badge and show form availability separately as มี/ไม่มี.
- Run `node --test tests/event-setup.cjs` for access, revisioned drafts, capacity, date-time, and translation regressions. Use the existing TypeScript transpiler and Node test runner for pure helpers.

### Details, form access, and scheduling

- Normalize after edits and restore. Public events allow either form, both, or neither. Private events always enable Registration and Whitelist, with an optional Survey. Survey disabled means `surveyAccess = null`. Survey without Registration is Direct (`public`). Turning Survey back on starts at Direct. Enable Registration Required only when both forms are on and show it disabled otherwise.
- Show each enabled form’s opening and closing times inside its settings card. Survey closing defaults to the event end and follows changes to that time. Preserve saved custom or extended schedules. Registration Required uses the Registration capacity and consumes no extra seat. Direct Survey has optional independent capacity. Show “ไม่จำกัด” / “Unlimited” for an empty limit and persist positive integers or `null`.
- Date/time inputs use `components/form/DateTimePicker.tsx` (TailAdmin/Flatpickr) with localized labels and 24-hour `DD/MM/YYYY HH:mm`. Use `core/i18n/bangkok-datetime.ts` to convert Asia/Bangkok wall time (+07:00) to/from UTC. Browser timezone and native locale formatting must not define event time.
- Follow language dropdown Figma `3273:12577` / `3306:12677`. Offer English Template, suggested languages, and custom ISO 639-1 codes. Validate membership and normalize case. Title, description, venue, and floor/zone are translated. Dates, access, and form settings are shared. Portal Thai/English is independent. Preview carries validated `lang` across devices and bounded return links, falling back to the event default translation as a whole.
- Use “Registration Form” / “Survey Form” in EN and “ฟอร์มลงทะเบียน” / “ฟอร์มแบบสอบถาม” in TH, with matching nested keys.

### Branding and media

- Use `types/event/branding.ts`, `core/event/branding.ts`, and `hooks/useEventBranding.ts`. Save metadata with the API draft and read the legacy key for recovery. Reuse the TailAdmin native color input in `BrandingColorPicker`. Supply color suggestions from the current banner when sampling is available. Update Preview immediately.
- Primary colors the Header and media placeholders. Secondary colors the background and is the default for the Footer; `footerColor` overrides it. Accent colors actions and QR headings. Apply event branding to the participant display, public form UI, and canvas inside the Registration and Survey editors. Keep the title and question cards in each editor white. Event Setup, management shells, and the preview mat use platform colors. Apply `chromeOpacity` (0–100) to selected Header/Footer colors and honor legacy `transparentChrome` when opacity is absent. `core/event/participant-colors.ts` picks black/white foregrounds and adjusts Accent text against the actual Secondary to at least 4.5:1. Preserve event-scoped logos.
- Logo and Banner share `utils/image-upload.ts`. Accept one supported browser-decodable file strictly under 10 MiB. The Icon/Wordmark picker accepts PNG/SVG up to 5 MiB and locks the crop to 1:1 for icons and 16:5 for wordmarks. Attempt the media API first. Development defaults to `.eventsurvey-media/` under the project root. On hosting, configure `EVENT_SETUP_MEDIA_DIR` with the absolute path to a persistent writable volume. Apply the 1 MiB per-image limit only to LocalStorage fallback after a failed upload. Keep previewable unsaved images in memory and save server URLs in the draft after upload.
- Prefer original bytes. Optimize JPEG/PNG in their own format only when smaller, preserving aspect ratio and PNG alpha. Preserve WebP, AVIF, GIF, and BMP bytes. Rasterize SVG to bounded PNG for upload and retain the original SVG for browser fallback when it fits. Release bitmap/object URLs, cancel superseded or dismissed work, preserve saved images until a successful replacement, and surface read, size, and quota errors.
- Banner supports 3:4, 1:1, and 16:9. Persist crop position separately and preserve the chosen layout's minimum dimensions during optimization.

### Participant preview

- Use two icon tabs for participant previews in Branding and Preview & Publish. Show the selected Event Display or Participant Public Form.
- Use the live [Participant Event Display section](https://www.figma.com/design/fVXZJ63REaHE4H6aoiY4hp/Event-Survey-User-Interface?node-id=3102-12480) for all three layouts. Portrait (3:4) and Square (1:1) stack banner, information and QR. Landscape (16:9) places the information and vertical QR card beneath the banner. Participant forms have their own header and footer.
- The public event slug and the Branding and Publish previews share `ParticipantEventScreen` and `EventDisplay`. Published events use server event data and the available form links. Setup previews use draft data, read-only controls and the sample QR artwork in `public/images/event-preview/`.
- `ParticipantDisplayPreview` fits the LCD canvas in its preview container. Full Preview at `/preview/event` keeps the toolbar, selected display/form, content language and return destination. Only the published event accepts language changes and navigates to live forms.

### Whitelist

- Show the Whitelist action for Private and keep its Registration switch on. Link the workspace menu to the standalone `/event/whitelist` page for eligible events and users. Save Details before navigating there from Setup. Without a supported Registration Unique Field, show the prerequisite and link to the Registration Builder according to permission. Permit one Unique Field per form across creation, editing, duplication and API saves.
- Use `components/event/whitelist/`, `types/event/whitelist.ts`, `core/event/whitelist.ts`, and `useEventWhitelist`. Preserve screen `1327:2631`, overlays `1327:2775` / `1850:5227` / `1850:5228`, and existing `@raksitbell` components, IDs, and prototype links.
- Use the authenticated setup API. `canManageWhitelist` derives from `manage_registration_form`. The API checks event, permission, Private + Registration, and editable lifecycle. `manage_event` alone is insufficient.
- Use “ผู้มีสิทธิ์เข้าร่วมอีเวนต์” in Thai navigation and “Whitelist” in English. Put Back and Save in the workspace hero. Below the list heading, show the used/total count for the whole list. Combine the status filter with search.
- Manual entry and CSV import stage until Save. Cancel discards dialog edits and navigation warns when dirty. Validate and normalize using the configured Registration Unique Field type, including recovered browser entries. Keep used IDs. Avoid storing uploaded CSVs and import history.

### Form Setup and publication

- `/event/forms` shows read-only BFF summaries through `useEventFormSummaries`. Integrated wrappers reuse the Form team's Builder and provide a return to Setup. Builder saves/schedules through its existing forms API, including when opened from Setup. Creating a form can set the server form flag. Details toggles only update the setup draft.
- Preview & Publish opens the participant preview immediately. Validate required event details on Continue and use the Form Builder validator when scheduling an enabled draft form. Save Draft can preserve unfinished work. Public events can publish with zero, one, or both forms. A complete Thai or English form is sufficient.
- Private publication requires at least one saved Whitelist entry bound to the current Registration form and Unique Field. The first guest can register after publication. Participant forms check the entered identifier against the published list on the server before releasing questions. Registered-only surveys require separate proof of completed registration.
- Confirm Publish before validating the exact draft revision and creating its immutable server snapshot. Participant pages and form lifecycle jobs use the snapshot schedule for the matching form ID. Legacy forms use their stored schedules and honor recorded closures. Restore published Setup from the snapshot.
- Use additive `appearance: "event"` in `useConfirm()` for Publish confirmation, errors, and success. Keep default styling for other features. The Figma success action closes the prototype dialog. Avoid creating a Dashboard route for that label.

### Integration evidence from 9 November 2026

Recheck current refs before integrating. The review of `origin/dev`, `origin/main`, `origin/feature/form-builder`, and `origin/feature/dashboard` describes those versions.

- Form Builder added `/form`, `/form/registration`, and `/form/survey` with UI in `components/event/form/`. Preserve its `form` locale namespace and workspace/setup's `eventHome`. Reconcile Builder lifecycle changes in the BFF.
- Keep one `components/event/workspace/EventWorkspacePanel.tsx`. Reconcile Dashboard changes to `/event` imports, workspace service/types, globals, and locale messages while preserving the card, empty/error states, and Details navigation.
- The reviewed Dashboard used `services/auth/access.ts`, `starts_at` / `ends_at`, `eventStartsAt` / `eventEndsAt`, and a different lifecycle. The reviewed `dev` used role permissions, `start_at` / `end_at`, `startsAt` / `endsAt`, and `draft/scheduled/open/closed`. Reconcile service, type, and auth contracts explicitly and run both feature suites. Textual merge success or an isolated build cannot establish runtime compatibility.
- At `c369c31`, `git merge-tree --write-tree --name-only` found no textual conflicts with `origin/dev` or `origin/main`. Form Builder conflicted in both dictionaries, `api/event/forms/[id]/status/route.ts`, `services/admin/overview.ts`, `services/event/forms.ts`, and `types/mock.ts`. Dashboard conflicted in `.gitignore`, globals, the Workspace panel, role mapping, both dictionaries, workspace service, and mock types. Keep `dev`'s invite/mail dependencies, including `nodemailer` and its types, when integrating older branches.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
