# The Human Craft Manifesto: AI Aesthetic Restrictions & Engineering Standards

> **MANDATORY INSTRUCTION FOR ALL AI CODING AGENTS, ASSISTANTS, AND DEVELOPERS**  
> **Standard:** Principal Frontend Engineer & Staff Product Designer (20+ Years Experience)  
> **Target Calibre:** Apple (iOS/macOS HIG), Linear.app, Stripe, Meta (Instagram/Threads), VS Code (Abyss/Dark Modern).

---

## 1. The Core Directive: "Zero AI Smell"

AI models naturally tend to generate flash-over-substance code: giant empty boxes, neon glowing shadows, rainbow cards, arbitrary "PRO/AI" badges, and sluggish animations.

**This is strictly forbidden on the Gymix codebase.**

Every screen, component, and interaction must feel **earned, deliberate, ergonomic, and rock-solid** — as if engineered by a veteran staff engineer who has spent two decades crafting high-performance, human-centered applications.

---

## 2. The 10 "AI-Smell" Hallmarks (Permanently Banned)

Any code containing these anti-patterns will be rejected:

| # | Banned AI Anti-Pattern | Why It Is Unacceptable | The 20-Year Veteran Solution |
|---|---|---|---|
| **1** | **Bloated "Cavernous" Boxes** (`p-8` or `p-10` with two tiny words) | Wastes 70% of vertical viewport; forces endless painful scrolling. | **Intentional Information Density**: Compact padding (`p-3.5` to `p-5`), scannable inline metadata. |
| **2** | **Rainbow Cards in One Grid** (Card 1 green, Card 2 blue, Card 3 purple, Card 4 amber) | Looks like a kindergarten art project or amateur SaaS template. | **90% Neutral Canvas**: All cards share the same neutral surface; color is restricted to a small 12px status dot or percentage trend. |
| **3** | **Neon / Drop-Shadow Glow Mud** (`shadow-purple-500/50`, `glow-primary`) | Destroys optical contrast, causes eye fatigue, screams "AI template". | **1px Subtle Opacity Borders**: `border: 1px solid rgba(255,255,255,0.08)` or `border-subtle`. Razor-sharp on OLED & Retina. |
| **4** | **Logo & Brand Color Disconnect** (Green UI with a Purple logo) | Destroys brand identity; looks like two different products spliced together. | **Single Brand Spine**: Signature accent strictly locked to **Gymix Electric Violet (`#7C3AED` / `#8B5CF6`)** matching `/logo-transparent.png`. |
| **5** | **Pretentious Floating Micro-Tags & Sparkle Icons** ("✨", "AI POWERED", "PRO") | Pointless AI hallmark; instantly signals bot-generated code. | **Clean Human Typography**: Strict ban on `Sparkles` icon. Write section titles cleanly and plainly. |
| **6** | **Icon-In-A-Squircle-Box Anti-Pattern** (`w-8 h-8 rounded-xl bg-color/10 border`) | Wrapping every single icon in a colored rounded box screams "AI demo template". Real apps (Instagram, Apple, Linear) never do this. | **Standalone Clean Icons**: Icons must be naked, borderless SVGs that sit directly beside text with proper opacity (`text-muted` or `text-primary`). |
| **7** | **Heavy Card Box Overkill (Lack of Floating Content)** | Wrapping every single piece of content in a high-contrast dark gray filled box (`bg-zinc-900 border border-zinc-800 rounded-2xl`). | **Seamless Floating Canvas (Instagram / Threads Standard)**: Content floats directly on the canvas background. Separation is achieved through subtle dividers (`border-b border-white/[0.06]`), whitespace, and typography—NOT by drawing heavy dark gray boxes around everything. |
| **8** | **Card-Trapped Empty States** (Putting "No data found" in a giant 400px bordered card) | Makes empty screens feel heavy, clunky, and oppressive. | **Floating Borderless Empty States**: Understated icon and clear text floating directly in the center of the canvas without an enclosing card box. |
| **9** | **Disappearing Mobile Navigation** (Hiding nav behind a broken hamburger with no bottom bar) | Unusable on smartphones; users get stranded on sub-screens. | **Native Thumb-Zone Architecture**: Fixed bottom nav bar (`h-16 pb-safe`) with instant visual feedback and smooth drawers. |
| **10**| **Heavy Mobile Glassmorphism** (`backdrop-blur-xl` on mobile lists) | Destroys GPU performance on real Android/iOS devices; causes scroll stutter. | **Opaque High-Performance Surfaces**: Solid, clean background tokens (`bg-zinc-950` / `#0A0F1D`) with zero frame drops. |
| **11**| **Over-Rounded Clumsy Shapes** (`rounded-3xl` or `rounded-[32px]` on standard buttons) | Makes everything look like a toy button; destroys visual alignment. | **Proportional Corner Radii**: `rounded-xl` (12px) for buttons/inputs, `rounded-2xl` (16px) for cards. Never exceed 24px. |
| **12**| **Sluggish "Look At Me" Animations** (1000ms swooshes, infinite bouncing icons) | Makes software feel slow and unresponsive; annoys real power users. | **Snappy Human Physics**: 150ms–200ms ease-out transitions; micro-haptic `active:scale-95` on tap. Fast and invisible. |

---

## 3. The 4 Golden Pillars of Human Staff Engineering

### Pillar I: Information Architecture & Placement
A real gym or business software is used by real humans standing at a busy front desk or checking stats on a phone with one hand:
- **Above the Fold Priority**: Core pulse metrics (Active Gyms/Members, Daily Revenue, Urgent Alerts) must be visible without scrolling on a standard 800px viewport.
- **Inline Grouping**: Place the metric value, the trend percentage (`+12% MoM`), and the period label on the **same horizontal line or compact vertical stack**. Never give a 2-word label a 100px tall box.
- **Thumb Reachability**: Primary mobile triggers must be within the lower 50% of the screen.

### Pillar II: Color Discipline (The 90 / 10 Rule)
- **90% Neutral Canvas**:
  - **Midnight Abyss**: Deep Navy base (`#080C16`) + Slate Navy surfaces (`#0F172A`).
  - **OLED Dark**: Deep Zinc base (`#09090B`) + Zinc-900 surfaces (`#121215`).
  - **Light Modern**: Snow base (`#F8FAFC`) + Pure White surfaces (`#FFFFFF`).
- **10% Signature Accent**:
  - Exclusively **Gymix Electric Violet (`#7C3AED` / `#8B5CF6`)** — derived directly from the GX logo gradient.
- **Functional Semantics (Status Only)**:
  - Green is for money collected or active state ONLY.
  - Red is for expired licenses or failed payments ONLY.
  - Amber is for pending attention ONLY.

### Pillar III: Typography Precision
- Sole typeface: **Inter** (no font soup).
- Strict 4-level typographic rhythm:
  ```
  [10px - 11px]  OVERLINE / BADGE  ── Font-black, uppercase, tracking-wider, text-muted
  [14px - 15px]  SECTION TITLE     ── Font-bold, text-primary, tracking-tight
  [22px - 28px]  KPI METRIC VALUE  ── Font-black, tracking-tight, text-primary
  [12px - 13px]  BODY / METADATA   ── Font-medium, text-secondary
  ```

### Pillar IV: Touch & Interaction Ergonomics
- Every interactive element MUST have:
  1. `cursor-pointer` (never default pointer on buttons).
  2. `active:scale-95` micro-compression feedback.
  3. Clear hover state: subtle border highlight or surface shift (`transition-all duration-150`).
  4. Minimum touch target size of `44px x 44px` on mobile.

---

## 4. The "Senior Human Review" Checklist

Before finishing any task, every AI agent MUST mentally run this checklist:

- [ ] **Does this look like Instagram / Linear / VS Code, or an AI demo site?**
- [ ] **Are there any oversized boxes with giant empty spaces?** If yes, tighten padding to `p-4` or `p-5`.
- [ ] **Does the primary accent match the purple/violet GX logo?** (No random emerald buttons where brand buttons belong).
- [ ] **Is the mobile experience first-class?** Does it have a visible, tactile bottom navigation bar?
- [ ] **Are all borders 1px subtle opacity?** (No thick cartoon strokes, no neon glow drop shadows).
- [ ] **Are all dark mode Tailwind classes valid?** (NEVER use `dark:bg-zinc-850`, always standard steps `800`, `900`, `950`).
- [ ] **Is the copy natural human Hindi/English, without cheesy AI corporate buzzwords?**

---

## 5. Authority & Enforcement

This document is co-authored with the Gymix platform lead. Any AI agent, PR, or commit that introduces tacky AI-smell, bloated containers, or rainbow cards must be immediately refactored to comply with this manifesto.
