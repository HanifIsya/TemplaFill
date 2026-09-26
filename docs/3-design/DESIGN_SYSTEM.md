# Design System

> Visual identity, tokens, and component library for TemplaFill's frontend.
> **Last updated**: 2026-09-26 (frontend polish pass). This document now reflects
> the **shipped implementation** in `frontend/src` — it was previously aspirational
> and diverged from the code (indigo palette, Inter/JetBrains fonts, gradients).

---

## Brand Identity

| Attribute | Value |
|-----------|-------|
| **Name** | TemplaFill |
| **Tagline** | Extract. Map. Fill. |
| **Personality** | Professional, trustworthy, modern, efficient |
| **Tone** | Confident but approachable, technical but not intimidating |

The tagline is rendered as a mono, letter-spaced eyebrow above the landing H1
(`HeroLanding.tsx`) and in the Footer.

---

## Theme: Dark-Only

The app applies `dark` on `<html>` (`app/layout.tsx`) and ships **one theme**.
There is no toggle. Component-level light-mode classes (`bg-white`,
`text-slate-900`) are inert and retained only because components were written
with both variants; new work should target the dark surface directly and avoid
adding more `dark:` duplication.

Page background is owned by `body` via `--bg-page` (`globals.css`). Components
sit on `bg-slate-900` surfaces with `border-slate-800` borders.

---

## Color Palette

TemplaFill uses the **Tailwind slate scale** for neutrals and **Tailwind blue**
for the accent. It does **not** use indigo (the earlier spec was stale).

### Accent (Blue)
| Usage | Class / token | Value |
|-------|---------------|-------|
| Primary button bg | `bg-blue-700` / `--accent-base` | `#1D4ED8` |
| Primary button hover | `bg-blue-800` | `#1E40AF` |
| Dark-mode accent | `bg-blue-600` / `--accent-base` (dark) | `#2563EB` |
| Accent text on dark | `text-blue-400` | `#60A5FA` |
| Accent subtle bg | `bg-blue-950` / `--accent-subtle` | `#172554` |
| Accent border | `border-blue-800` / `--accent-border` | `#1E3A8A` |

### Neutral (Slate, dark surfaces)
| Usage | Class | Value |
|-------|-------|-------|
| Page background | `--bg-page` | `#0B0F17` |
| Surface / cards | `bg-slate-900` / `--bg-surface` | `#111827` |
| Elevated / inputs | `bg-slate-800` / `--bg-elevated` | `#1A2234` |
| Base border | `border-slate-800` / `--border-base` | `#263245` |
| Strong border | `border-slate-700` / `--border-strong` | `#374761` |
| Primary text | `text-slate-100` / `--text-primary` | `#F8FAFC` |
| Secondary text | `text-slate-300` / `--text-secondary` | `#CBD5E1` |
| Muted text | `text-slate-400` / `--text-muted` | `#8493A8` |

### Semantic
| Meaning | Text (dark) | Background | Border |
|---------|-------------|------------|--------|
| Success / high confidence | `text-emerald-400` | `bg-emerald-950` | `border-emerald-800` |
| Warning / medium confidence | `text-amber-300` | `bg-amber-950` | `border-amber-800` |
| Error / low confidence / not found | `text-red-400` | `bg-red-950` | `border-red-800` |
| Info / account tier | `text-blue-300` | `bg-blue-950` | `border-blue-800` |

> The `--success-*`, `--warning-*`, `--error-*` custom properties in
> `globals.css` mirror these values.

---

## Typography

### Font Stack (actual)
TemplaFill uses **IBM Plex** loaded via `next/font/google` (`app/layout.tsx`):

```css
--font-sans: 'IBM Plex Sans', system-ui, sans-serif;   /* body + headings */
--font-mono: 'IBM Plex Mono', ui-monospace, monospace; /* labels, badges, keys */
```

The earlier `Inter` + `JetBrains Mono` spec was never adopted.

### Scale (as used)
| Role | Classes | Notes |
|------|---------|-------|
| Landing hero | `text-3xl sm:text-4xl font-bold tracking-tight` | H1 |
| Page title | `text-xl sm:text-2xl font-bold tracking-tight` | Section H2 |
| Card title | `text-sm font-bold` / `text-xs font-semibold uppercase` | mono for eyebrows |
| Body | `text-sm` / `text-xs` | dense technical UI |
| Caption / labels / badges | `text-[11px]` / `text-[10px] font-mono uppercase` | heavily used |

> **Accessibility note**: the UI leans on 10–11px text. Ensure contrast at these
> sizes meets WCAG AA against `slate-900/950` (avoid `slate-500` for critical text).

---

## Spacing

Based on a 4px grid via Tailwind's default scale (`p-2`=8px, `p-3`=12px,
`p-4`=16px, `p-5`=20px, `space-y-4`/`gap-3` common). Custom `--space-*` tokens
are not used in components.

---

## Border Radius

| Usage | Class | Value |
|-------|-------|-------|
| Badges, tags | `rounded` | 4px |
| Buttons, inputs | `rounded` | 4px |
| Cards, panels | `rounded` / `rounded-lg` | 4–8px |
| Modals | `rounded-lg` | 8px |
| Pills | `rounded-full` | 9999px |

The shipped UI favors a tight 4px radius for the "technical" feel.

---

## Shadows

| Usage | Class |
|-------|-------|
| Inputs, subtle lift | `shadow-xs` |
| Toasts, cards | `shadow-md` |
| Modals | `shadow-2xl` |

---

## Component Library

### Button
| Variant | Classes | Usage |
|---------|---------|-------|
| Primary | `bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white` | Main actions |
| Secondary | `border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800` | Secondary actions |
| Ghost | `text-slate-600 hover:text-slate-900` | Tertiary actions |
| Danger | `bg-red-600` / `text-red-400` | Destructive |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed` | Inactive |

All interactive controls should include the `.focus-ring` utility for a visible
keyboard focus indicator.

### Input Field
- Padding: `px-3 py-1.5` (compact) / `px-3 py-2` (modal forms)
- Border: `border-slate-300 dark:border-slate-700`
- Background: `bg-white dark:bg-slate-800`
- Focus: `focus:outline-none focus:border-blue-600` + `.focus-ring`

### Card / Panel
- `rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`
- Padding: `p-4` / `p-5`
- Optional shadow: `shadow-xs`

### Drop Zone (File Upload)
- `rounded border border-dashed border-slate-300 dark:border-slate-700`
- **Drag over**: `border-blue-600 bg-blue-50/50 dark:bg-blue-950/30`
- **File accepted**: `border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60`
- **File rejected**: in-app warning toast (no native `alert`)

### Confidence Badge
| Level | Classes | Label |
|-------|---------|-------|
| High (≥0.8) | `bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800` | `High (NN%)` |
| Medium (0.5–0.8) | `bg-amber-50 dark:bg-amber-950 …` | `Review (NN%)` |
| Low (<0.5) | `bg-red-50 dark:bg-red-950 …` | `Missing (NN%)` |

### Engine Badge
| Engine | Classes | Label |
|--------|---------|-------|
| `gemini` | indigo tones | `Gemini 3.6 Flash` |
| `deepseek` | blue tones | `DeepSeek` |
| `heuristic` | amber tones | `Fallback` |

### Progress Bar
- Track: `bg-slate-100 dark:bg-slate-800`
- Fill: **solid** `bg-blue-700 dark:bg-blue-500` (no gradient)
- Height: `h-2`, radius `rounded`, `transition-all duration-200`

### Modal (shared primitive — `components/Modal.tsx`)
- Portal to `document.body`; overlay `bg-black/80 backdrop-blur-sm`
- Panel: `rounded-lg border border-slate-800 bg-slate-900 shadow-2xl`
- `role="dialog"` + `aria-modal` + `aria-labelledby`
- Escape closes, backdrop click closes, focus trapped, focus restored on close, body scroll locked

### Toast Notification
- Position: `fixed top-4 right-4 z-[60]`, `max-w-sm`
- Panel: `rounded border bg-white dark:bg-slate-900 shadow-md`
- Leading uppercase mono badge (INFO / SUCCESS / WARNING / ERROR)
- **Auto-dismiss**: success/info ~4.2s; **warning/error persist** until dismissed
- `role="alert"`/`aria-live` for errors

---

## Animation Tokens

Motion uses Tailwind's default timing utilities
(`transition-colors`, `transition-all`, `duration-200`, `animate-spin`,
`animate-pulse`). There is no custom easing token set.

**Reduced motion**: `globals.css` collapses animation/transition durations to
`0.001ms` under `@media (prefers-reduced-motion: reduce)`.

---

## Iconography

Using **Lucide React** (`lucide-react`):
- Size: `w-3` / `w-3.5` (inline), `w-4` (controls), `w-5` (section headers)
- Color: inherits text color; accent icons use `text-blue-400`

Key icons:
| Icon | Usage |
|------|-------|
| `UploadCloud` | File upload |
| `FileText` | PDF / audit log |
| `Search` | Field search |
| `Check` / `CheckCircle2` | Success, confirmed |
| `X` | Error, close |
| `Edit3` | Edit field |
| `RefreshCw` / `RotateCcw` | Re-extract / reset |
| `Ban` | Skip field |
| `Download` | Download file |
| `Sparkles` | AI engine badge |
| `ShieldCheck` / `Gauge` | Tier / quota |
| `LogIn` / `LogOut` | Tier auth |
| `ArrowRight` | Next / generate |

