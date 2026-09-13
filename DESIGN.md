---
version: 1.0
name: Secure DMS Design System
colors:
  primary: "#1B2A4A"
  secondary: "#2E7D74"
  danger: "#B3261E"
  warning: "#B8860B"
  success: "#2E7D74"
  background: "#F7F8FA"
  background_dark: "#14181F"
  surface: "#FFFFFF"
  text_primary: "#1A1D23"
  text_secondary: "#5A6270"
  border: "#E1E4EA"
typography:
  heading_font: "Inter"
  body_font: "Inter"
  mono_font: "JetBrains Mono"
  scale:
    headline: "28px/1.3/700"
    title: "20px/1.4/600"
    body: "15px/1.5/400"
    label: "12px/1.4/500"
    mono: "13px/1.5/500"
rounded:
  none: "0px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "999px"
spacing:
  unit: "8px"
  scale: [4, 8, 12, 16, 24, 32, 48, 64]
components:
  button:
    radius: "sm"
    states: [default, hover, active, disabled]
  card:
    radius: "md"
    border: "1px solid border"
    elevation: "none"
  input:
    radius: "sm"
    border: "1px solid border"
  badge:
    radius: "full"
    style: "text-forward, low fill"
---

# Overview

This is the design system for a **Secure Digital Document Management System** built for law enforcement, courts, and investigative departments. It governs FIRs, charge sheets, witness statements, forensic reports, and judgments — documents with real legal and evidentiary weight.

**Audience:** Investigating officers, prosecutors, judges, forensic experts, and administrators — professionals working under time pressure who need to trust this system with sensitive, legally significant data.

**Mood:** Authoritative, calm, precise. This should feel like well-designed enterprise/government software — closer to a banking dashboard or an air-traffic control interface than a consumer app or startup product. Every visual choice should reinforce *institutional trust*, not novelty.

**Non-goals:** No gradients, no playful illustration, no oversaturated color, no trendy heavy rounding. If a choice would look at home in a fintech-startup landing page, it's probably wrong here. If it would look at home in a courtroom filing system, it's right.

---

# Colors

| Role | Hex | Usage |
|---|---|---|
| Primary | `#1B2A4A` | Navigation, primary buttons, headers — deep navy conveys authority and institutional trust |
| Secondary / Success | `#2E7D74` | Verified states, confirmations, active/positive indicators — muted teal, never bright green |
| Danger | `#B3261E` | Tamper detected, access denied, destructive actions only — used sparingly so it retains urgency |
| Warning | `#B8860B` | Pending verification, unverified documents, expiring access grants |
| Background | `#F7F8FA` | Base canvas, light mode |
| Background (dark) | `#14181F` | Optional dark-mode base for late-shift/low-light use |
| Surface | `#FFFFFF` | Cards, panels, modals |
| Text primary | `#1A1D23` | Body copy, headings |
| Text secondary | `#5A6270` | Metadata, timestamps, helper text |
| Border | `#E1E4EA` | Card borders, dividers, table rules |

**Why:** Color here is a signaling system, not decoration. Navy and teal are the only colors allowed to feel "designed" — red and amber are reserved exclusively for state (danger/warning) so they never lose meaning through overuse. A user should be able to scan a case list and understand document status by color alone, at a glance, without reading labels.

---

# Typography

- **Headings & body:** Inter — highly legible at small sizes, strong multilingual glyph coverage (important given Hindi/regional-language content alongside English), and reads as neutral/professional rather than stylized.
- **Monospace:** JetBrains Mono — used specifically for case numbers, document hashes, ledger entry IDs, and timestamps. Monospace makes these values scannable and prevents ambiguity (e.g., distinguishing `0` from `O`, `1` from `l`) — critical when a hash mismatch is the entire point of an integrity check.

**Scale**
| Style | Size / Line-height / Weight | Use |
|---|---|---|
| Headline | 28px / 1.3 / 700 | Page titles ("Case #4521 — State vs. Sharma") |
| Title | 20px / 1.4 / 600 | Section headers (Documents, Timeline, Audit Log) |
| Body | 15px / 1.5 / 400 | Standard content, descriptions |
| Label | 12px / 1.4 / 500 | Metadata, field labels, status tags |
| Mono | 13px / 1.5 / 500 | Hashes, case numbers, timestamps, ledger IDs |

**Why:** One type family throughout (Inter) keeps the interface feeling unified and calm rather than decorative — hierarchy comes from weight and size, not font-switching. The dedicated monospace token exists because this system's core trust mechanism (hash-chain integrity) is only useful if a human can actually compare two hash strings character-by-character; proportional fonts make that harder than it needs to be.

---

# Layout

- **Base spacing unit:** 8px. All padding, margins, and gaps are multiples of this (4, 8, 12, 16, 24, 32, 48, 64) so density stays consistent across dense data tables and sparser detail views.
- **Screen padding:** 24px desktop, 16px mobile.
- **Grid:** 12-column, with a persistent three-pane structure on desktop:
  - **Left (fixed, ~240px):** Case/document navigation
  - **Center (fluid):** Document viewer, search results, or AI query interface
  - **Right (collapsible, ~320px):** Metadata, extracted fields, audit trail for whatever is focused in the center pane

**Why:** This mirrors how the actual users work — everything is anchored to a *case*, not a loose file browser. An officer should never lose the sense of "which case am I in" while navigating documents, comments, or AI answers within it. The right panel keeps provenance (who verified this, what's the hash, what's the ledger history) always one glance away rather than buried in a separate tab — provenance is a first-class citizen in this UI, not an afterthought.

---

# Elevation & Depth

- Prefer **flat, bordered surfaces** over drop-shadows for cards and panels — a 1px `border` token, not elevation, is the default way to separate content.
- Reserve shadow for **transient, overlay elements only**: modals, dropdowns, toasts. `0 4px 12px rgba(0,0,0,0.08)` — subtle, never heavy or glowing.
- No elevation is used to convey importance or hierarchy — that's typography and color's job. Elevation only ever means "this is temporarily floating above the page," nothing more.

**Why:** Heavy shadows and floating-card aesthetics read as "consumer app." Flat, bordered surfaces read as "official record" — closer to a well-typeset legal document than a social feed. Keeping elevation meaning narrow and consistent also avoids the common AI-generated-UI failure mode of every panel getting a random shadow for no reason.

---

# Shapes

- **Radius scale:** `none: 0px`, `sm: 6px`, `md: 8px`, `lg: 12px`, `full: 999px` (pills/avatars only).
- Cards and panels: `md` (8px) — enough to feel modern, not so much it feels casual.
- Buttons and inputs: `sm` (6px).
- Data tables: `none` — sharp corners, since tables are about density and precision, not friendliness.
- Status badges/pills: `full`.

**Why:** Consumer apps have trended toward very large radii (16px+) to feel friendly and soft. This system should feel precise and serious instead — smaller, consistent radii across components signal "built for professional use," and the sharp-cornered tables specifically reinforce that dense data is being presented as-is, not softened.

---

# Components

### Document card
- **Default:** white surface, `border` token, `md` radius, no left accent
- **Unverified:** 3px left border in `warning` color + small "Pending Verification" label
- **Verified:** 3px left border in `secondary`/success color + signature icon + verifier name/timestamp in `label` style
- **Flagged/tampered:** 3px left border in `danger` + inline warning icon, non-dismissible until resolved

### Buttons
- **Primary:** `primary` navy fill, white text, `sm` radius — main actions (Verify, Upload, Submit)
- **Secondary:** outline only, `primary` text/border, transparent fill — secondary actions (Cancel, View)
- **Danger:** `danger` fill, white text — reserved strictly for destructive/irreversible actions (Revoke Access, Delete Draft)
- States: default, hover (8% darken), active (12% darken), disabled (40% opacity, no hover)

### Status badges
- Pill-shaped (`full` radius), low-fill background (10% tint of the state color) with full-opacity text in that same color — text-forward, not icon-heavy. Examples: "Verified", "Pending Review", "Access Restricted", "AI-Assisted — Unreviewed"

### Audit log / ledger rows
- Monospace font for timestamp, hash, and entry ID columns
- Alternating row background (`background` vs `surface`) for scanability across long logs
- Broken-chain entries (integrity failure) render with a `danger` background tint on the entire row, not just an icon — this state should be impossible to miss

### AI response blocks
- Visually distinct container: light `secondary`-tinted background (not white, not a plain chat bubble) to separate AI-generated content from human-authored case notes at a glance
- Inline citation chips (small, `mono` font, clickable) linking directly to the source document/section
- Persistent label: "AI-assisted — verify before use" in `label` style, always visible, never collapsible

**Why:** Components carry the most safety-critical signaling in this whole system. A user should never be able to mistake an unverified document for a verified one, or an AI-generated claim for a human-confirmed fact, from a quick glance. Every component above is designed so that *status is legible even to someone scanning quickly under time pressure* — color, position, and persistent labeling all reinforce the same signal rather than relying on any single cue alone.
