# M3 Analytics, Filters and Reports

Implements the supplied FR-015–018, FR-026 / BR-008–009 / AC-006 / PD-005 scope against the current mock API. The linked Google Docs could not be accessed; this is not a claim of SRS, security, architecture or UAT approval.

## Routes

- `/event/analytics`: counts, response trend, API-defined widgets.
- `/event/analytics/responses`: paged masked response table mapped by stable form/field/option IDs.
- `/event/analytics/reports`: CSV download and printable localized PDF report.
- `/event/analytics/builder`: add/remove/reorder widgets, titles, permitted non-PII field sources, chart selection, columns.
- BFF: `GET /api/event/analytics`, `POST /api/event/analytics/export?format=csv|pdf`, `PATCH /api/event/analytics/layout`.

All reads and exports re-resolve the active user, event membership, event-scoped role, dashboard access and registration/survey permissions. Forms, submissions, fields, options and answers are validated at each join. Soft-deleted records are excluded. Event selection deliberately contains only the account's assigned event. Date ranges include both boundaries using the event timezone. Navigating between Analytics, Responses and Reports retains applied filters. Builder edits use the full permitted event scope.

PII is masked in the BFF before it reaches the client, including boolean/numeric/option fields. Raw mode requires an Event Admin, `can_view_unmasked_pii`, a recorded permission update, and a grantor who is an active Platform Admin. Event Sub-Users and impersonation cannot use raw mode. PII fields are excluded from chart grouping to avoid indirect disclosure. Grant administration is not part of this feature; the existing API grant fields are consumed.

Audit writes are awaited before returning views or export content. Audit metadata contains actor/effective user, event, form, date scope, locale, count and raw flag, without answer values. Layout audit is named `update.requested` because the mock server does not offer transactions.

## Session configuration

Set `AUTH_SESSION_SECRET` to a long cryptographically random secret in the deployment environment. It is **required in production**, including for login; never use the test value. Development without a secret uses an ephemeral process key (sign in again after a restart). Login now issues an eight-hour signed HttpOnly cookie in addition to the existing browser navigation hint. Analytics never authorizes from the unsigned hint alone. Logout clears the verified cookie. Existing users must sign out/in once.

The existing auth guards and unrelated admin APIs still use the legacy navigation cookie. The upstream mock API remains publicly accessible and has demo credentials. This frontend work does not make that upstream a production security boundary; authenticated backend storage and review are still required before production/UAT security signoff.

## Actual API vs schema / wireframes

The deployed API uses `dashboard_data`, `dashboard_widgets.dashboard_data_id`, `type`, and `config_json`; it does not implement `dashboard_layouts` from the local DBML. It also has no draft/publish/revision/transaction contract. Save applies immediately; multiple mock writes are not atomic and a failure requires reload/reconciliation. Concurrent editor conflict resolution needs backend revision support.

The response API has no attendance, started-response or partial-response records. These metrics are not fabricated. Whitelist widget sources cannot use the response date scope and are explicitly shown as unsupported. Existing numeric-average widgets are supported. New widgets support response counts and non-PII field distributions. The trash/recovery screen is outside the supplied Analytics task scope.

PDF mode returns a print-ready HTML report and opens the native browser Print / Save as PDF flow; **it does not return `application/pdf` or generate a server-side PDF**. The layout uses A4 pages, localized dates, escaped content, masked/raw status and applied filter metadata. CSV uses UTF-8 BOM, CRLF, escaped quotes and formula-injection protection. Both export all filtered responses, not only the table page. Export audit records preparation, not completion of the browser's PDF save dialog.

Large-volume aggregation/pagination and export jobs should move to the backend: this mock integration fetches the filtered dataset and uses per-resource requests. Data may change between independent dashboard/export requests; an immutable report snapshot needs backend support.

## Verification

- `node --test tests/analytics.cjs`: synthetic in-memory API; checks scope, timezone boundaries, soft deletion, stable ID mapping, options, masking, raw grant, impersonation denial, cookie tampering, CSV injection, audit failure and layout permissions.
- `npm run lint` and `npx tsc --noEmit`.
- Production compilation and static page generation succeeded, but the installed Next.js 16.4.0 security gate returned a failing exit code. Upgrade/review the existing framework dependency before release.
- Browser and HTTP integration checks use an isolated in-memory copy of the mock API, not writes to the shared hosted API.

No Product/Security/Architecture/UX review approval, GitHub Issue/PR, or Trello completion is implied by implementation. FS dependency reviews in the supplied brief remain external acceptance gates.
