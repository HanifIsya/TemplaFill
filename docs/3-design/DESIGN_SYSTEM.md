# Design System

> Visual identity, tokens, and component library for TemplaFill's frontend.

---

## Brand Identity

| Attribute | Value |
|-----------|-------|
| **Name** | TemplaFill |
| **Tagline** | Extract. Map. Fill. |
| **Personality** | Professional, trustworthy, modern, efficient |
| **Tone** | Confident but approachable, technical but not intimidating |

---

## Color Palette

### Primary Colors
| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--color-primary-50` | `#EEF2FF` | 226 100% 97% | Lightest background |
| `--color-primary-100` | `#E0E7FF` | 226 100% 94% | Hover backgrounds |
| `--color-primary-200` | `#C7D2FE` | 226 100% 89% | Active states |
| `--color-primary-300` | `#A5B4FC` | 226 100% 82% | Borders, outlines |
| `--color-primary-400` | `#818CF8` | 226 94% 74% | Icons, secondary actions |
| `--color-primary-500` | `#6366F1` | 239 84% 67% | **Primary brand color** |
| `--color-primary-600` | `#4F46E5` | 243 75% 59% | Primary buttons, links |
| `--color-primary-700` | `#4338CA` | 245 58% 51% | Hover on primary |
| `--color-primary-800` | `#3730A3` | 244 47% 42% | Active on primary |
| `--color-primary-900` | `#312E81` | 244 47% 35% | Dark text accent |

### Neutral Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-neutral-50` | `#FAFAFA` | Page background |
| `--color-neutral-100` | `#F5F5F5` | Card backgrounds |
| `--color-neutral-200` | `#E5E5E5` | Borders |
| `--color-neutral-300` | `#D4D4D4` | Disabled states |
| `--color-neutral-400` | `#A3A3A3` | Placeholder text |
| `--color-neutral-500` | `#737373` | Secondary text |
| `--color-neutral-600` | `#525252` | Body text |
| `--color-neutral-700` | `#404040` | Headings |
| `--color-neutral-800` | `#262626` | Strong text |
| `--color-neutral-900` | `#171717` | Darkest text |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success-500` | `#22C55E` | High confidence, success states |
| `--color-success-50` | `#F0FDF4` | Success background |
| `--color-warning-500` | `#F59E0B` | Medium confidence, warnings |
| `--color-warning-50` | `#FFFBEB` | Warning background |
| `--color-error-500` | `#EF4444` | Low confidence, errors, not found |
| `--color-error-50` | `#FEF2F2` | Error background |
| `--color-info-500` | `#3B82F6` | Informational, tips |
| `--color-info-50` | `#EFF6FF` | Info background |

### Dark Mode
| Light Token | Dark Value |
|-------------|-----------|
| `--color-neutral-50` | `#0A0A0A` |
| `--color-neutral-100` | `#171717` |
| `--color-neutral-200` | `#262626` |
| `--color-neutral-700` | `#D4D4D4` |
| `--color-neutral-800` | `#E5E5E5` |
| `--color-neutral-900` | `#FAFAFA` |
| `--color-primary-500` | `#818CF8` (lighter for dark bg) |

---

## Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Scale
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-display` | 48px / 3rem | 700 | 1.1 | Landing page hero |
| `--text-h1` | 36px / 2.25rem | 700 | 1.2 | Page titles |
| `--text-h2` | 24px / 1.5rem | 600 | 1.3 | Section headings |
| `--text-h3` | 20px / 1.25rem | 600 | 1.4 | Card titles |
| `--text-body` | 16px / 1rem | 400 | 1.5 | Body text |
| `--text-body-sm` | 14px / 0.875rem | 400 | 1.5 | Secondary text, captions |
| `--text-caption` | 12px / 0.75rem | 500 | 1.4 | Labels, badges, timestamps |
| `--text-mono` | 14px / 0.875rem | 400 | 1.5 | Code, field names |

---

## Spacing

Based on 4px grid (`--space-unit: 4px`):

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps (icon-text) |
| `--space-2` | 8px | Small gaps (between badges) |
| `--space-3` | 12px | Default inner padding |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Comfortable padding |
| `--space-6` | 24px | Section separation |
| `--space-8` | 32px | Large section gap |
| `--space-10` | 40px | Page-level spacing |
| `--space-12` | 48px | Hero sections |
| `--space-16` | 64px | Major layout gaps |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements (badges, tags) |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Modals, large cards |
| `--radius-full` | 9999px | Pills, circular elements |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift (inputs) |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | Cards |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Modals |

---

## Component Library

### Button

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | `primary-600` | white | none | Main actions (Generate, Download) |
| Secondary | white | `neutral-700` | `neutral-200` | Secondary actions (Preview, Back) |
| Ghost | transparent | `primary-600` | none | Tertiary actions (Re-extract, Skip) |
| Danger | `error-500` | white | none | Destructive actions (Delete) |
| Disabled | `neutral-100` | `neutral-400` | none | Inactive states |

**Sizes**: `sm` (32px height), `md` (40px height), `lg` (48px height)

### Input Field
- Height: 40px (md)
- Border: 1px solid `neutral-200`
- Border radius: `radius-md`
- Focus: 2px ring `primary-300`
- Error: border `error-500`, helper text `error-500`
- Disabled: background `neutral-50`, text `neutral-400`

### Card
- Background: white (light) / `neutral-100` (dark)
- Border: 1px solid `neutral-200`
- Border radius: `radius-lg`
- Padding: `space-5`
- Shadow: `shadow-md`
- Hover (if interactive): `shadow-lg` + slight translateY(-1px)

### Drop Zone (File Upload)
- Border: 2px dashed `neutral-300`
- Border radius: `radius-lg`
- Background: `neutral-50`
- **Drag over**: border `primary-400`, background `primary-50`, scale(1.01)
- **File accepted**: border `success-500`, background `success-50`
- **File rejected**: border `error-500`, background `error-50`

### Confidence Badge
| Level | Color | Icon | Label |
|-------|-------|------|-------|
| High (≥0.8) | `success-500` bg `success-50` | 🟢 | "High confidence" |
| Medium (0.5-0.8) | `warning-500` bg `warning-50` | 🟡 | "Review suggested" |
| Low (<0.5) | `error-500` bg `error-50` | 🔴 | "Not found" |

### Progress Bar
- Track: `neutral-200`
- Fill: gradient from `primary-500` to `primary-400`
- Height: 8px
- Border radius: `radius-full`
- Animation: smooth width transition (300ms ease-out)
- Indeterminate: shimmer animation (pulse left-to-right)

### Toast Notification
- Position: top-right
- Width: 360px max
- Border radius: `radius-lg`
- Shadow: `shadow-lg`
- Left accent bar: 4px wide, colored by type
- Auto-dismiss: 3s (success), manual (warning/error)

---

## Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements entering |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements leaving |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy interactions |
| `--duration-fast` | `150ms` | Micro-interactions (hover) |
| `--duration-normal` | `250ms` | Standard transitions |
| `--duration-slow` | `400ms` | Page transitions, modals |

---

## Iconography

Using **Lucide React** icon set:
- Size: 16px (inline), 20px (buttons), 24px (navigation)
- Stroke width: 1.5px (default), 2px (emphasis)
- Color: inherit from text color

Key icons:
| Icon | Usage |
|------|-------|
| `Upload` | File upload |
| `FileText` | PDF document |
| `FileSpreadsheet` | Excel document |
| `Presentation` | PowerPoint document |
| `Search` | Field search |
| `Check` | Success, confirmed |
| `X` | Error, close |
| `Edit` | Edit field |
| `RefreshCw` | Re-extract |
| `SkipForward` | Skip field |
| `Download` | Download file |
| `Eye` | Preview source |
| `ChevronRight` | Next step |
| `ArrowLeft` | Back |
