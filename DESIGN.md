---
name: "EventSurvey"
description: "EventSurvey design system and participant Event Display typography contract, verified against the Figma source of truth."
version: "2026-11-15"
status: "Figma text styles applied; repository/CSS integration pending"
sources:
  figma: "https://www.figma.com/design/fVXZJ63REaHE4H6aoiY4hp/Event-Survey-User-Interface"
  figmaEventInformation: "https://www.figma.com/design/fVXZJ63REaHE4H6aoiY4hp/Event-Survey-User-Interface?node-id=3140-5261"
  figmaQR: "https://www.figma.com/design/fVXZJ63REaHE4H6aoiY4hp/Event-Survey-User-Interface?node-id=3140-5280"
  reference: "Luma DESIGN.md supplied by the project owner; comparative design reference, not an imported design system"
colors:
  brandPrimary: "#AE85D1"
  brandSecondary: "#EBE1F4"
  actionPrimary: "#8365A0"
  backgroundPage: "#F3F1F1"
  surface: "#FFFFFF"
  textPrimary: "#242333"
  textSecondary: "#676474"
  borderDefault: "#B5B3B7"
typography:
  fontFamily: "Inter"
  eventDisplay:
    eventTitle: {fontSize: 40, fontWeight: 700, lineHeight: 48}
    sectionHeading: {fontSize: 20, fontWeight: 600, lineHeight: 28}
    body: {fontSize: 20, fontWeight: 400, lineHeight: 30}
    dateTimePrimary: {fontSize: 20, fontWeight: 600, lineHeight: 30}
    dateTimeSecondary: {fontSize: 20, fontWeight: 500, lineHeight: 30}
    valueEmphasis: {fontSize: 20, fontWeight: 600, lineHeight: 28}
    supportingValue: {fontSize: 18, fontWeight: 400, lineHeight: 27}
    metaLabel: {fontSize: 16, fontWeight: 500, lineHeight: 24}
    secondaryHeading: {fontSize: 16, fontWeight: 400, lineHeight: 24}
    avatarInitial: {fontSize: 16, fontWeight: 600, lineHeight: 24}
    qrTitle: {fontSize: 24, fontWeight: 600, lineHeight: 33}
    qrLabel: {fontSize: 20, fontWeight: 600, lineHeight: 28}
    helper: {fontSize: 14, fontWeight: 400, lineHeight: 21}
layout:
  eventDisplayWidthPx: 800
  portraitCanvas: {width: 1080, height: 1920}
  squareCanvas: {width: 1080, height: 1920}
  landscapeCanvas: {width: 1920, height: 1080}
  portraitBannerRatio: "3:4"
  squareBannerRatio: "1:1"
  landscapeBannerRatio: "16:9"
  eventDisplaySectionGapPx: 20
  eventInformationPaddingPx: {vertical: 20, horizontal: 32}
  qrSectionPaddingPx: {vertical: 18, horizontal: 32}
  eventDisplayCardRadiusPx: 20
---

# EventSurvey Design System

## 1. Purpose and source precedence

This document is a **repository handoff contract** for EventSurvey's current Figma design. The updated **participant-facing Event Display** typography is applied in Figma. This document is **not evidence that the web app's CSS, React components or backend have been changed**.

Order of authority: approved EventSurvey SRS for functionality and permissions → live EventSurvey Figma variables/components/styles for visual implementation → the owner's explicit decisions → Luma's supplied `DESIGN.md` for *comparative sizing only*. Luma's extraction does not establish the exact typography-role mapping or container width on any individual Luma event page.

**Do not globally overwrite Admin UI typography or import Luma's Apple system font / neutral brand palette.** The scale below is scoped to `EventDisplay` until other screen families are reviewed.

## 2. Colors — verified semantic Figma aliases

| EventSurvey semantic token | Value | Usage |
| --- | --- | --- |
| `brand/primary` | `#AE85D1` | Lavender accent |
| `brand/secondary` | `#EBE1F4` | Soft lavender |
| `action/primary` | `#8365A0` | Primary action |
| `background/page` | `#F3F1F1` | System page background token; event-specific backdrops may differ |
| `background/surface` | `#FFFFFF` | Cards and panels |
| `text/primary` | `#242333` | Main reading text |
| `text/secondary` | `#676474` | Supporting information |
| `border/default` | `#B5B3B7` | Card/section borders |

These are the resolved **Light-mode semantic Figma token values** at the time of review. Do not assume that a specific page always uses `background/page`: check its actual bound styles and event theme overrides.

## 3. Typography — EventDisplay System Text Styles

**Font family:** Inter. Values are pixels at the Figma display scale, not automatically scaled to physical device pixels or CSS `rem`.

| Semantic role | Size / line-height | Weight | Figma Text Style |
| --- | --- | --- | --- |
| Event title | **40 / 48** | Bold 700 | `Typography/EventDisplay/Title/40-Bold-48` |
| Section heading (`Hosted by`, `About Event`) | **20 / 28** | Semi Bold 600 | `Typography/EventDisplay/SectionHeading/20-SemiBold-28` |
| Short description / About Event body | **20 / 30** | Regular 400 | `Typography/EventDisplay/Body/20-Regular-30` |
| Event start date/time | **20 / 30** | Semi Bold 600 | `Typography/EventDisplay/DateTimePrimary/20-SemiBold-30` |
| Event end date/time | **20 / 30** | Medium 500 | `Typography/EventDisplay/DateTimeSecondary/20-Medium-30` |
| Venue/organizer emphasis | **20 / 28** | Semi Bold 600 | `Typography/EventDisplay/ValueEmphasis/20-SemiBold-28` |
| Location supporting detail | **18 / 27** | Regular 400 | `Typography/EventDisplay/SupportingValue/18-Regular-27` |
| Date/location meta-label | **16 / 24** | Medium 500 | `Typography/EventDisplay/MetaLabel/16-Medium-24` |
| Secondary bilingual heading | **16 / 24** | Regular 400 | `Typography/EventDisplay/SecondaryHeading/16-Regular-24` |
| Organizer avatar initial | **16 / 24** | Semi Bold 600 | `Typography/EventDisplay/AvatarInitial/16-SemiBold-24` |
| QR section title | **24 / 33** | Semi Bold 600 | `Typography/EventDisplay/QRTitle/24-SemiBold-33` |
| QR option label | **20 / 28** | Semi Bold 600 | `Typography/EventDisplay/QRLabel/20-SemiBold-28` |
| Supporting helper/preview note | **14 / 21** | Regular 400 | `Typography/EventDisplay/Helper/14-Regular-21` |

The **existing scoped Figma Text Styles were updated in place and retained their style IDs**. Existing shared component instances therefore receive this hierarchy. `Typography/H1`, `Typography/Body/Base` and other Admin/global styles were intentionally not modified.

### Readability governance

1. Use **named semantic Text Styles**, not arbitrary size overrides, for reusable UI. Review the live component hierarchy and actual style binding before creating a new token.
2. In the 800px **participant display**, main reading copy and dates must use **20px**; essential secondary values should be **at least 18px**, metadata/labels **16px**, and nonessential helper text **14px**. Avoid rendering any required information in 12px to make it fit.
3. The 40px event title may wrap; increase card height through Auto Layout rather than reducing the font. Preserve line-height and adequate whitespace.
4. Admin forms, dense data tables, mobile web and other experiences have separate responsive sizing contracts. Do **not** apply EventDisplay's minimums globally or infer that a 1080px LCD is the same as a 1080px CSS browser viewport.
5. Check both Thai and English strings, long event titles, date/time start and end, long venues, **255-character descriptions**, and QR labels. Text must not be cut off by nested `clipsContent` or fixed-height rows.
6. A missing line should prompt an Auto Layout inspection (`HUG`, width, parent clips, padding, line-height) **before** allowing smaller type or truncation.

## 4. Layout, media and sizing

- Current reviewed vertical participant canvases: **1080 × 1920**.
- Shared column in Portrait and Square: **fixed 800px** on those canvases; banner, `EventInformation`, and `QRCodeSection` align on the same edges.
- Section spacing: **20px** between banner, information and QR in the currently inspected display roots.
- Event information card: **20px vertical / 32px horizontal** padding; QR section: **18px vertical / 32px horizontal** padding. Event display card corner radius: **20px**.
- Portrait banner **3:4**: 800 × 1066.67px; Square banner **1:1**: 800 × 800px. Landscape uses a 16:9 banner on a landscape 1920 × 1080 canvas; its content width/element geometry follows its own layout contract and should not be assumed to be the same fixed 800px column.
- `fixed-width: 800px` on the reviewed 1080×1920 display is **not** a universal mobile responsive rule. For narrower interactive screens define a separate width constraint (such as `min(800px, viewport - insets)`), then verify content and QR reachability.
- Preserve aspect ratios and show an explicit crop preview for photos with mismatched source ratios. Do not silently stretch 3:4 artwork into Square or Landscape.
- The current participant LCD display has **no Header or Footer**; do not inherit Admin shell scaffolding into it.

### Measured full-content test (15 Nov 2026)

| Reviewed state | Body height | Event Information height | About Event body height | Fits 1080×1920 |
| --- | ---: | ---: | ---: | --- |
| Portrait normal | 1775.67px | 382px | 30px | Yes |
| Square normal | 1509px | 382px | 30px | Yes |
| Portrait About Event: 255 characters | **1865.67px** | 472px | 120px (4 lines) | Yes, but tight |
| Square About Event: 255 characters | 1599px | 472px | 120px (4 lines) | Yes |

The Portrait 255-character example leaves approximately **54px of combined vertical free space** on the 1920px canvas. This is a snapshot, not proof that all translations, larger titles or actual content combinations fit. Long LCD content requires a deliberate height/overflow policy: do not truncate required fields or reduce body size to fake a pass.

## 5. Reusable components and localization

- `EventDisplay / EventInformation`: reusable Figma Component Set with `Language=TH|EN` and `Menu=Closed|Open`, with event title, date/time, venue, organizer and About Event overrides.
- `EventDisplay / QRCodeSection`: reusable Figma Component Set with `Language=TH|EN`, registration/survey labels and QR instance-swap properties.
- Component masters live in `02 · Components / By Type`; consuming participant views use **instances**, not detached copies.
- Thai/English display should be coordinated by one locale state owner in implementation. A Figma comparison screen that navigates to another frame is not proof of shared production state.
- Language icon uses a globe without flag-only meaning. Maintain readable selection labels, 44px touch targets and explicit closed/open state.
- QR imagery shown in current prototypes is **sample-only**, not a validated production code or endpoint.
- The existing `rsb-figma` overlay standard requires one black 50% viewport backdrop for anchored popovers. The current language prototype may not fully comply; do not describe it as passing without a targeted correction and QA.

## 6. Repository integration recommendation (not yet implemented)

If the repository does not already expose these semantic aliases, use the following **suggested** CSS mapping. Inspect the app's real CSS/Tailwind configuration before merging; do not create duplicate active tokens or rename existing code APIs without a migration.

```css
:root {
  /* EventSurvey semantic colors */
  --es-color-brand-primary: #ae85d1;
  --es-color-brand-secondary: #ebe1f4;
  --es-color-action-primary: #8365a0;
  --es-color-surface: #ffffff;
  --es-color-text-primary: #242333;
  --es-color-text-secondary: #676474;
  --es-color-border-default: #b5b3b7;

  /* Participant-facing EventDisplay typography */
  --es-event-title-size: 40px;
  --es-event-title-line-height: 48px;
  --es-event-section-size: 20px;
  --es-event-section-line-height: 28px;
  --es-event-body-size: 20px;
  --es-event-body-line-height: 30px;
  --es-event-label-size: 16px;
  --es-event-label-line-height: 24px;
  --es-event-helper-size: 14px;
  --es-event-helper-line-height: 21px;
  --es-event-column-width: 800px;
}
```

## 7. Relation to the supplied Luma DESIGN.md

The supplied Luma file reports `headline-md: 40px / lineHeight 1.2`, `body-md: 20px / lineHeight 1.5`, and text/label styles at 20, 18, 16, 14 and 13px. These observations motivated EventSurvey's more legible hierarchy. **Luma's `headline-display: 80px` is not used** because this component is an event card, not an oversized hero display; EventSurvey keeps its existing brand palette and Inter. The Luma file does **not** verify a per-event-card maximum width of 800px; its `800px` entry is a breakpoint.

## 8. Implementation checklist

- [ ] Match current Figma Text Style names, weights, sizes and line heights in web components.
- [ ] Ensure child date/time rows grow with text and do not clip the end date/time.
- [ ] Confirm shared 800px column on approved LCD viewports; separately test narrower web/mobile widths.
- [ ] Verify `EventInformation` and `QRCodeSection` consume one locale state and update both label sets.
- [ ] Test both languages, maximum-length bio/description content, and longer localized venue/date labels.
- [ ] Verify QR controls, actual destinations, accessibility and display contrast at physical viewing distance.
- [ ] Check all actual role routes/permissions and empty-banner upload states independently; Figma QA is not app implementation.
- [ ] Reconcile component popovers with the current backdrop/overlay design standard.
- [ ] Keep SRS business rules authoritative; the Short Text 255-character rule in the SRS currently applies to **form question fields** and is not an independently approved requirement for event descriptions.

**Verified:** Figma scoped typography styles, canonical Portrait/Square and QA 255-character geometry. **Not verified here:** browser runtime, live translation persistence, QR validity, repo implementation, or Present-mode end-to-end interactions.
