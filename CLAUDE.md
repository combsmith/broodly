@https://github.com/combsmith/.github/blob/main/AGENTS.md
@AGENTS.md

# Broodly — Claude Code Project Context

For comprehensive project guidelines (design system, components, Figma integration, architecture), see [AGENTS.md](./AGENTS.md).

## Quick Reference

- **Figma Design File:** https://www.figma.com/design/pL2D8Cvu6XdrI9NBREr3nE/Broodly
- **Stack:** Expo + React Native + TypeScript + Gluestack UI v3 + NativeWind
- **Backend:** Go (chi + gqlgen) on GCP
- **Planning artifacts:** `_bmad-output/planning-artifacts/`

## Coding Standards

### Organization Standards (Required)

All code in this repository MUST comply with the [combsmith organization coding standards](https://github.com/combsmith/.github/blob/main/AGENTS.md). That document defines mandatory practices for:

- **TDD** — tests before implementation, no `.skip()`, no coverage-ignore comments
- **Pre-commit quality checks** — format, lint, type-check, and test before every commit
- **SOLID, CLEAN, DRY, DDD, KISS, YAGNI** — software engineering principles
- **Defensive coding** — validate at system boundaries, trust internal code, fail fast
- **Separation of concerns** — layered architecture, inward dependencies, no framework bleed
- **CI quality gates** — CodeQL, SonarCloud, CodeRabbit, Copilot review, all required to pass
- **Multi-agent isolation** — git worktrees for concurrent agent work, one workspace per story
- **Security** — never commit secrets, use environment variables or secret managers
- **BMAD Method** — spec-driven development with planning artifacts before implementation

If a rule in this file conflicts with the org standards, this file takes precedence (as stated in the org AGENTS.md).

### Broodly-Specific Coding Guidelines

#### TypeScript (Expo + React Native)

- **Strict TypeScript** — `strict: true` in all tsconfig files. No `any` types unless interfacing with untyped third-party libraries, and even then prefer `unknown` with type guards.
- **GraphQL types** — Always use generated types from `packages/graphql-types/`. Never hand-write GraphQL response types.
- **Zustand stores** — One store per domain concern (e.g., `useInspectionStore`, `useAuthStore`). Use `immer` middleware for nested state updates. Keep stores thin — server state belongs in TanStack Query, not Zustand.
- **TanStack Query** — All server data fetching goes through TanStack Query with persistent cache. Use query key factories for consistency. Mutations must invalidate relevant queries on success.
- **Platform code** — Platform-specific logic goes in `src/platform/`. Use `.ios.ts`, `.android.ts`, `.web.ts` extensions only when platform behavior genuinely diverges. Prefer cross-platform solutions.
- **Imports** — Use path aliases (`@broodly/ui`, `@/features`, `@/services`) instead of deep relative paths. No barrel files except the explicit `packages/ui/src/index.ts` export.

#### Go (API Server)

- **Workspace structure** — The repo uses Go 1.24 workspace mode with `go.work` at the root. The root `go.mod` defines tooling support for workspace-wide scans (e.g., `govulncheck`); it is not an application module. The `apps/api` module contains the actual API service. Both modules are listed in `go.work`'s `use` directive to form the workspace.
- **Domain-first structure** — Business logic lives in `internal/domain/` with zero infrastructure imports. Services in `internal/service/` orchestrate domain logic. Repositories in `internal/repository/` implement persistence via sqlc.
- **sqlc for all queries** — No hand-written SQL in Go code. All queries defined in `.sql` files and generated via sqlc. Use transactions through the repository layer.
- **Error handling** — Return typed domain errors from services. Map to GraphQL errors in resolvers. Never expose internal error details to clients.
- **gqlgen resolvers** — Keep resolvers thin. Delegate to services immediately. Resolvers handle auth context extraction and response mapping only.
- **Context propagation** — Pass `context.Context` through all layers. Use it for request-scoped values (auth claims, trace IDs) and cancellation. Never store mutable state in context.

#### Monorepo

- **Package boundaries are hard boundaries.** `packages/ui` must not import from `apps/mobile`. `apps/mobile` must not import from `apps/api`. Shared types go in `packages/domain-types` or `packages/graphql-types`.
- **Dependency management** — Use workspace protocol (`workspace:*`) for internal package references. Keep root `package.json` for tooling only — app dependencies belong in their respective `apps/` or `packages/` package.json.

---

## Key Differentiator: Zero-Tap Beeyard

IMPORTANT: Broodly's core differentiator is a zero-tap beeyard experience. Once a beekeeper starts their inspection session, they should NEVER need to tap the phone while in the field.

- Entire multi-hive inspection flow is voice-driven as one continuous session
- User navigates between hives via voice: "next hive", "move to Hive 4", "done with this hive"
- All observations, actions, and photo triggers are voice-commanded
- System announces next hive context via TTS on transition
- UI tapping is available as fallback but NEVER required
- Post-session "Evening Review" provides tap-friendly UI for corrections after leaving the field
- This zero-tap approach is what distinguishes Broodly from every competitor

## Key Rules

1. **Figma MCP flow** — always run `get_design_context` + `get_screenshot` before implementing any design
2. **Gluestack UI v3** — use as component foundation, never build custom when a primitive exists
3. **Compound components** — always use full Gluestack patterns (e.g., `<Button><ButtonText>...</ButtonText></Button>`)
4. **Color tokens only** — never hardcode hex colors, use `bg-primary-500`, `text-error-600`, etc.
5. **WCAG 2.1 AA** — all pairings must meet contrast ratios, status is never color-only
6. **48px minimum touch targets** — for all interactive elements (gloved field use)
7. **Shared UI in `packages/ui/`** — feature components in `apps/mobile/src/features/`

### Required Flow (do not skip)

1. Run `get_design_context` first to fetch the structured representation for the exact node(s)
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`
3. Run `get_screenshot` for a visual reference of the node variant being implemented
4. Only after you have both `get_design_context` and `get_screenshot`, download any assets needed and start implementation
5. Translate the output (usually React + Tailwind) into Broodly's conventions: Expo + React Native + Gluestack UI v3 + NativeWind
6. Validate against Figma for 1:1 look and behavior before marking complete

### Implementation Rules

- Treat Figma MCP output (React + Tailwind) as a representation of design and behavior, not as final code style
- Translate Tailwind utility classes into NativeWind classes using the Broodly design token system
- Reuse existing components from `packages/ui/` and Gluestack UI v3 instead of duplicating functionality
- Use the project's color tokens, typography scale, and spacing tokens consistently
- Respect existing routing (Expo Router), state management (Zustand + TanStack Query), and data-fetch patterns
- Strive for 1:1 visual parity with the Figma design
- Validate the final UI against the Figma screenshot for both look and behavior

---

## Component Organization

### Directory Structure (Planned)

```
broodly/
├── apps/
│   ├── mobile/                     # Expo app (iOS, Android, Web)
│   │   ├── app/                    # Expo Router screens
│   │   ├── src/features/           # Feature modules (inspection, recommendations, planning)
│   │   ├── src/services/           # GraphQL client, media upload
│   │   ├── src/store/              # Zustand stores, TanStack Query cache
│   │   └── src/platform/           # Platform-aware components
│   └── api/                        # Go GraphQL API service
│       ├── graph/schema/           # GraphQL schema files (.graphql)
│       ├── internal/domain/        # Domain types and business logic
│       ├── internal/service/       # Application services
│       └── internal/repository/    # sqlc queries
├── packages/
│   ├── ui/                         # Shared UI component library
│   ├── graphql-types/              # Generated TypeScript types
│   ├── domain-types/               # Shared constants
│   └── config/                     # Shared configuration
└── infra/
    └── terraform/                  # IaC for GCP resources
```

### Component Rules

- IMPORTANT: All shared UI components go in `packages/ui/`
- Feature-specific components go in `apps/mobile/src/features/<feature>/components/`
- Screen components go in `apps/mobile/app/` (Expo Router file-based routing)
- Build all custom components on top of Gluestack UI v3 tokens and primitives
- Component file structure: `ComponentName/index.tsx`, `ComponentName.test.tsx`
- Export all shared components from `packages/ui/src/index.ts`
- Use PascalCase for component names and files

---

## Design System Foundation: Gluestack UI v3

- IMPORTANT: Use Gluestack UI v3 as the component foundation for all standard UI elements
- Gluestack is built on NativeWind and Tailwind CSS primitives
- Components are installed via `npx gluestack-ui add <component>` into `components/ui/`
- Styling uses `tva()` (Tailwind Variant Authority) with `data-*` attribute state styling
- Parent-child variant inheritance via `withStyleContext()` / `useStyleContext()`
- Only build custom components where no Gluestack primitive satisfies a domain-specific need

### Gluestack Component Compound Pattern

IMPORTANT: Gluestack uses compound components. Always use the full pattern:
- `<Button><ButtonText>Label</ButtonText><ButtonIcon as={Icon} /></Button>`
- `<Alert><AlertIcon as={Icon} /><AlertText>Message</AlertText></Alert>`
- `<Badge><BadgeText>Label</BadgeText><BadgeIcon as={Icon} /></Badge>`
- `<Input><InputSlot><InputIcon as={Icon} /></InputSlot><InputField placeholder="..." /></Input>`
- `<Accordion><AccordionItem><AccordionHeader><AccordionTrigger><AccordionTitleText>...</AccordionTitleText><AccordionIcon /></AccordionTrigger></AccordionHeader><AccordionContent>...</AccordionContent></AccordionItem></Accordion>`

### Variant Dimensions (tva)

- **action**: `primary | secondary | positive | negative | default` (Button); `error | warning | success | info | muted` (Alert, Badge, Toast)
- **variant**: `solid | outline | link` (Button); `solid | outline` (Alert, Badge); `elevated | outline | ghost | filled` (Card)
- **size**: Component-specific scales (Button: `xs|sm|md|lg|xl`, Input: `sm|md|lg|xl`, Modal: `xs|sm|md|lg|full`)

---

## Color Token System (Gluestack v3 Convention)

IMPORTANT: Never hardcode hex colors. Always use Gluestack design tokens.

Token format: `--color-{category}-{shade}` with shades `0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`.
Stored as RGB triplets in `config.ts` via NativeWind `vars()`. Usage in NativeWind: `bg-primary-500`, `text-error-600`.

### Color Categories (10 semantic scales)

| Category | Role | 500 Value (Key) | Tailwind Usage |
|---|---|---|---|
| `primary` | Honey Amber | `#D4880F` | `bg-primary-500`, `text-primary-600` |
| `secondary` | Pollen Gold | `#E8B931` | `bg-secondary-500`, milestone celebrations |
| `success` | Leaf Green | `#2D7A3A` | `bg-success-500`, healthy state |
| `warning` | Dark Amber | `#B8720A` | `bg-warning-500`, risk indicators |
| `error` | Deep Rust Red | `#A63D2F` | `bg-error-500`, critical alerts |
| `info` | Sky Blue | `#4A90C4` | `bg-info-500`, offline banners |
| `typography` | Text | `#6B7280` (500) `#2C2C2C` (800) | `text-typography-800` (primary), `text-typography-500` (muted) |
| `background` | Warm Wax | `#FDF6E8` (50) `#FAFAF7` (100) | `bg-background-50` (surface), `bg-background-0` (white) |
| `outline` | Borders | `#E5E7EB` (200) | `border-outline-200`, `border-outline-300` |

### Semantic Background Tokens

- `bg-background-error` (#FEE2E2) — error state backgrounds
- `bg-background-warning` (#FFF3E0) — warning state backgrounds
- `bg-background-success` (#E8F5E9) — success state backgrounds
- `bg-background-info` (#E3F2FD) — info state backgrounds
- `bg-background-muted` (#F3F4F6) — muted/disabled backgrounds

### Contrast Requirements

- IMPORTANT: All pairings must meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text)
- High-risk pairings to validate: primary-500 on background-50, typography-500 on background-50, secondary-500 on background-100
- Status is NEVER color-only; always pair with icons, labels, and text

---

## Typography — Gluestack Heading & Text

System fonts only. Use Gluestack `<Heading>` and `<Text>` components with `size` prop.

| Component | Size Prop | Rendered Size | Weight | Semantic | Usage |
|---|---|---|---|---|---|
| `<Heading>` | `5xl` | 48px | 800 | h1 | Hero, splash |
| `<Heading>` | `3xl` | 30px | 700 | h1 | Screen titles |
| `<Heading>` | `2xl` | 24px | 700 | h2 | Section headers |
| `<Heading>` | `xl` | 20px | 600 | h3 | Card titles |
| `<Heading>` | `lg` | 18px | 600 | h4 | Subsections, modal titles |
| `<Text>` | `md` | 16px | 400 | — | Body copy, guidance (field default) |
| `<Text>` | `sm` | 14px | 400 | — | Secondary descriptions, labels |
| `<Text>` | `xs` | 12px | 500 | — | Metadata, timestamps (minimum size) |
| Custom | `font-mono text-xl` | 20px mono | 500 | — | Telemetry KPIs, numeric displays |

- IMPORTANT: Minimum body text is 16px (`<Text size="md">`). No text smaller than 12px (`<Text size="xs">`).
- Field-use screens default to `size="md"` or larger
- Typeface: system sans-serif (San Francisco / Roboto). Monospace for data displays.

---

## Spacing & Layout

- IMPORTANT: Use 8px base spacing system with consistent token increments (8, 16, 24, 32, 40, 48, 56...)
- Minimum touch target: 48x48px for all interactive elements (gloved field use)
- Primary actions during inspection: 56x48px minimum
- Minimum spacing between adjacent touch targets: 8px
- Voice microphone button: 56x56px minimum

### Layout Principles

- Context before controls: hive status and recommendation appear before secondary actions
- One decision at a time during inspection flow
- Progressive reveal: advanced details appear on demand, not by default
- Summary-before-detail at all interaction points

### Shape Language

- Rounded rectangles for primary interaction surfaces
- Hex-derived micro-shapes in badges, confidence chips, and section headers (subtle, premium, not playful)

---

## Responsive Breakpoints

- Mobile (primary): 320px–767px — single-column, sticky primary actions, bottom navigation
- Tablet (secondary): 768px–1023px — split-pane layouts, expanded accordions
- Desktop (secondary): 1024px+ — multi-column dashboards, persistent side navigation

---

## Status Semantics → Gluestack Action Mapping

IMPORTANT: Standardize these four status levels across ALL cards and indicators:

| Broodly Status | Gluestack Action | Color Token | Badge | Alert |
|---|---|---|---|---|
| `healthy` | `success` | `success-500` | `<Badge action="success">` | `<Alert action="success">` |
| `attention` | `warning` (outline) | `warning-300` | `<Badge action="warning" variant="outline">` | `<Alert action="warning">` |
| `warning` | `warning` (solid) | `warning-500` | `<Badge action="warning">` | `<Alert action="warning">` |
| `critical` | `error` | `error-500` | `<Badge action="error">` | `<Alert action="error">` |

- Warnings are ALWAYS non-blocking inline indicators (use `<Alert>` not `<AlertDialog>`)
- Status ALWAYS includes icon + text + color (never color alone)
- Offline state uses `<Alert action="info">`

---

## Custom Domain Components → Gluestack Base Mapping

Each custom component is built on Gluestack v3 primitives using `tva()` for variants.

| Broodly Component | Gluestack Base | tva() Variants | Key Sub-components |
|---|---|---|---|
| **RecommendationCard** | `Card` (elevated) | confidence: high\|medium\|low | Heading, Text, Progress, Button, Badge, Alert |
| **HiveHealthCard** | `Card` (elevated) | status: healthy\|attention\|warning\|critical | Heading, Text, Badge, Progress, HStack |
| **ApiaryHealthCard** | `Card` (elevated) | status: healthy\|attention\|warning\|critical | Heading, Text, Badge, HStack |
| **HomepageContextCard** | `Card` (filled) | type: weather\|bloom\|seasonal | Heading, Text, Icon |
| **VoiceLogCapture** | `Box` + `Fab` | state: idle\|listening\|processing\|confirm | Fab (mic icon), Text, Button, Input |
| **InspectionImageCapture** | `Box` + `Pressable` | — | Image, Spinner, Text |
| **ImageAnalysisResultCard** | `Card` (elevated) | confidence: high\|medium\|low | Heading, Text, Badge, Progress, Alert |
| **SkillProgressionCard** | `Card` (outline) | level: newbie\|amateur\|sideliner | Heading, Text, Progress, Badge |
| **ActionableNotificationCard** | `Card` (outline) | action: success\|warning\|error\|info | Heading, Text, Badge, Button |
| **ApiaryAccordionQueue** | `Accordion` | — | AccordionItem, AccordionTrigger, Badge |
| **ScopeConfirmationSheet** | `Actionsheet` | — | ActionsheetContent, Heading, Text, Button |
| **HiveWarningIndicator** | `Alert` (outline) | action: warning\|error | AlertIcon, AlertText |
| **OnDemandActionPlanPanel** | `Accordion` (single) | — | AccordionTrigger, AccordionContent, Card |
| **NotificationCenter** | `Drawer` | — | DrawerContent, VStack, Heading, Divider |
| **SeasonalPlanningCalendar** | `Box` + `Grid` | — | Pressable, Text, Badge |
| **MilestoneAchievementToast** | `Toast` (accent) | — | ToastTitle, ToastDescription |

### Key Rules

- IMPORTANT: Every recommendation must include: action + rationale + confidence + fallback
- Visual hierarchy on RecommendationCard: action (Heading xl) → rationale (Text sm) → confidence (Progress) → fallback (Alert warning)
- ColonyImprovementSignal uses `<Progress>` with `success-500` fill
- Homepage cards are `<Card variant="filled">` with semantic background colors
- Health cards use shared `HealthStatusCardBase` tva() with status variant

IMPORTANT: Distinguish actionable cards from informational cards:
- Actionable cards (tappable, navigate somewhere): primary-500 left border + chevron + hover state. Use Card variant='outline' with left border override.
- Informational cards (display only): no left border, no chevron, no hover. Use Card variant='filled'.
- This distinction is critical for field usability — users must instantly know what requires action vs what is context.

---

## Button Hierarchy (Gluestack tva)

- **Primary:** `<Button action="primary" variant="solid" size="xl">` — single most important action per viewport section (Start Inspection, Start Today's Plan)
- **Secondary:** `<Button action="primary" variant="outline">` — supportive options (View My Apiaries, Show Details)
- **Tertiary:** `<Button action="secondary" variant="link">` — low-risk utility (Ignore, Not now, Collapse)
- **Positive:** `<Button action="positive" variant="solid">` — confirmations (Did It, Confirm)
- **Negative:** `<Button action="negative" variant="solid">` — destructive/alert actions (Report Issue)
- Voice capture: `<Fab size="lg">` with `<FabIcon>` — 56px mic button on inspection/logging screens
- Field use: `size="xl"` (48px height) for primary actions. Voice Fab: 56px.

---

## Icon Conventions

- **Edit actions:** ALWAYS use a pencil icon instead of the word "Edit". Apply consistently across all edit triggers (inline edits, edit buttons, record editing, transcript correction). Pair with accessible label "Edit [item name]" for screen readers.
- **Live Mode:** Use an EQ Gradient icon (5 vertical equalizer bars in amber gradient — Pollen Gold edges, Primary Amber center, Deep Amber outer) for all Live Mode entry points. Bars animate when active; static when idle. Respects `prefers-reduced-motion`.

---

## Navigation Patterns

- All sessions start on the **Happy Context Homepage**
- Two primary CTAs: "View My Apiaries" and "Start Today's Plan"
- Navigation hierarchy: Organization → Apiary → Hive with persistent context labeling
- **App header (right side):** sync status indicator (when applicable), Live Mode EQ icon, notification bell icon with badge — visible on every authenticated screen
- Bottom navigation bar for top-level destinations (including Settings)
- Bottom sheets for quick confirmations; full modals only for irreversible operations
- Planning uses per-apiary accordion patterns

---

## Emotional Design & Tone

- Tone is calm, supportive, recovery-oriented — never punitive
- Language: "Nice work" not "Task complete"; "Here's what matters now" not "You missed inspections"
- Reduce fear before introducing complexity
- Warnings are constructive, recovery-oriented, with clear next steps
- Error messages always include a recovery path
- Progress signals (ColonyImprovementSignal) reinforce user competence

---

## Accessibility Requirements

- IMPORTANT: WCAG 2.1 AA compliance baseline
- All custom components must expose appropriate ARIA roles and labels
- Health cards announce: hive name, status level, next action date as single accessible description
- Recommendation cards announce: action, confidence, rationale in reading order
- Voice button announces state: "Voice input. Double tap to start recording"
- Warning indicators announce content when focused (no tap required)
- Did It / Ignore buttons include context: "Mark 'Add super to Hive 3' as done" not just "Did It"
- Respect `prefers-reduced-motion`: disable pulsing/waveform animations, use static alternatives
- Visible focus indicators on all interactive elements

---

## Offline & Sync Patterns

- Cache-first reads via TanStack Query persistent cache
- No offline writes in MVP — mutations require connectivity
- Offline indicator: Sky Blue banner with cloud-offline icon
- Staleness escalation: <24h subtle badge → 24-72h amber warning → >72h red banner with conservative defaults
- Image upload failure: queue locally with "will upload when online" label
- Session interruption: auto-save locally, offer "Resume inspection?" on relaunch

---

## Asset Handling

- IMPORTANT: If the Figma MCP server returns a localhost source for an image or SVG, use that source directly
- IMPORTANT: DO NOT import/add new icon packages — all assets should be in the Figma payload
- IMPORTANT: DO NOT use or create placeholders if a localhost source is provided
- Store downloaded assets in `apps/mobile/assets/`
- Inspection media uploads go to Google Cloud Storage (`broodly-media-{env}`)
- Compress before upload: HEIC/WebP for images, opus for audio

---

## Tech Stack Quick Reference

| Layer | Technology |
|---|---|
| Mobile/Web | Expo + React Native + TypeScript |
| Design System | Gluestack UI v3 + NativeWind |
| Styling | Tailwind CSS (via NativeWind) |
| Routing | Expo Router |
| Server State | TanStack React Query (persistent cache) |
| UI State | Zustand |
| GraphQL Client | urql or Apollo Client |
| Backend | Go (chi + gqlgen) |
| Database | PostgreSQL 16 + pgvector |
| Auth | Firebase Authentication (Google + Apple Sign-In only, no passwords) |
| AI/ML | Vertex AI (Embedding 2.0, Gemini) |
| Hosting | Google Cloud Platform (Cloud Run) |
| IaC | Terraform |

---

## Planning Artifacts

Comprehensive planning documents are in `_bmad-output/planning-artifacts/`:

- `prd.md` — Product Requirements Document (60 FRs, 27 NFRs) — Updated 2026-03-24: added FR12b2, FR21a, FR29a, FR31a, FR46a; updated FR16, FR19a, FR40; removed FR40a
- `ux-design-specification.md` — Full UX spec with design system, user flows, accessibility
- `architecture.md` — Technical architecture with all decisions
- `product-brief-bmad-method-2026-03-15.md` — Vision and target users
- `research/` — Domain and market research documents
