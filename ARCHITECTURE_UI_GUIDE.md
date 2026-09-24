# Gymix Tier-1 UI Architecture & Design System Guide

> **Single Source of Truth for Gymix Platform Design**  
> Inspired by **Instagram, Meta, Linear, Stripe, Apple HIG, and VS Code (Abyss/Dark Modern)**.  
> Every developer, agent, and designer working on Gymix MUST adhere strictly to this specification.

---

## 1. Core Philosophy: The 4 Secrets of Tier-1 Software

Why do apps like **Instagram, Facebook, LinkedIn, Stripe, and Linear** look effortlessly premium in both Light and Dark modes while amateur web apps look clumsy and cheap?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE TIER-1 DESIGN PYRAMID                            │
│                                                                         │
│   [ 10% Brand Signature ]   ── Electric Violet / GX Purple              │
│   [ 90% Neutral Canvas  ]   ── Midnight Navy / OLED Black / Clean Snow  │
│   [ 1px Subtle Borders  ]   ── High-precision razor lines (No blur mud) │
│   [ Content Density     ]   ── Compact, purposeful (No bloated boxes)   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Secret 1: "90% Neutral Canvas + 10% Signature Brand Accent"
- **The Rule**: 90% of the UI must be neutral (White, Slate, Zinc, Deep Navy). **Never turn entire card backgrounds into colorful rainbow boxes.**
- **The Brand Accent (10% Only)**: Reserved exclusively for:
  1. Primary Call-to-Action buttons (e.g. *Add Member*, *Pay Now*)
  2. Active navigation indicators (Bottom nav dot, active sidebar pill)
  3. Brand Mark / Logo presentation
- **Functional Colors are for Status Only**:
  - `Emerald (#10B981)`: Money collected / Active status **ONLY** (not general buttons).
  - `Rose (#EF4444)`: Expired / Overdue dues / Destructive actions **ONLY**.
  - `Amber (#F59E0B)`: Expiring soon / Pending attention **ONLY**.
  - `Sky (#0284C7)`: Informational notice **ONLY**.

### Secret 2: "Layer Elevation Over Heavy Drop Shadows"
- In dark themes, shadows are invisible or muddy. Premium software creates depth by **layering surfaces from dark to slightly lighter**:
  - **Base Canvas (Floor)**: Deepest tone (e.g. `#070A12` Navy / `#09090B` OLED)
  - **Surface (Cards / Panels)**: 1 step lighter (e.g. `#0E1424` / `#121215`)
  - **Elevated (Inputs, Table Headers, Dropdowns)**: 2 steps lighter (e.g. `#151E36` / `#18181B`)
  - **Floating (Modals, Popovers)**: Top layer with clean border (e.g. `#1C2744` / `#27272A`)

### Secret 3: "1px Subtle Opacity Borders Over Heavy Glows"
- **Permanent Ban**: Neon drop shadows (`shadow-purple-500/50`, `glow-primary`, multi-colored glowing cards).
- **The Standard**: Crisp 1px borders with intentional alpha transparency:
  - Light mode: `border: 1px solid rgba(15, 23, 42, 0.08)` (`border-slate-200`)
  - Dark OLED mode: `border: 1px solid rgba(255, 255, 255, 0.08)` (`border-zinc-800`)
  - Midnight Navy mode: `border: 1px solid rgba(99, 102, 241, 0.14)` (`border-indigo-900/40`)
- This creates razor-sharp optical containment without looking heavy or messy.

### Secret 4: "Brand Identity Alignment with the GX Logo"
- **The Soul of Gymix**: The logo (`/logo-transparent.png`) is an iconic, dynamic **GX** with an electric gradient of **Cyber Violet, Electric Purple, and Neon Indigo**.
- **The Harmony**: When the app uses **Violet/Indigo (`#7C3AED` / `#8B5CF6`)** as its signature accent, the entire interface naturally locks into harmony with the logo. Switching everything to green or random blue makes the logo feel like an alien sticker.

---

## 2. Eradicating "Bade-Bade Ajeeb Boxes" (Layout & Information Density)

### The Problem: Why Bulky Boxes Ruin UI
Amateur UIs put 3 words of text inside an enormous 200px tall empty card with giant margins, making the user scroll endlessly and making the page look like an empty template.

### The Solution: Compact, Proportional Placement
1. **Balanced Padding**:
   - Small cards / Widgets: `p-3.5 sm:p-4.5` (never `p-8` for simple stats).
   - Major containers / Sections: `p-4 sm:p-6`.
2. **Inline Metadata**: Place trends, badges, and counters inline with titles or values rather than giving each their own giant row.
3. **Stat Cards Standard**:
   ```jsx
   // TIER-1 COMPACT KPI CARD (Linear/Stripe Standard)
   <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
     <div className="flex items-center justify-between gap-2 mb-3">
       <span className="text-[11px] font-bold uppercase tracking-wider text-muted truncate">{title}</span>
       <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
         {icon}
       </div>
     </div>
     <div className="flex items-baseline justify-between gap-2">
       <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight">{value}</span>
       {trend && (
         <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
           {trend}
         </span>
       )}
     </div>
     {subtext && <p className="text-[11px] text-muted mt-2 font-medium truncate">{subtext}</p>}
   </div>
   ```

---

## 3. The 3 Official Themes (Light, OLED Dark, and Midnight Abyss)

Inspired by VS Code, Linear, and modern IDEs, Gymix supports three primary ambient modes:

```
┌─────────────────┬───────────────────┬───────────────────┬───────────────────┐
│ Token           │ 1. Light Modern   │ 2. OLED Dark      │ 3. Midnight Abyss │
├─────────────────┼───────────────────┼───────────────────┼───────────────────┤
│ Base (Canvas)   │ #F8FAFC (Snow)    │ #09090B (OLED)    │ #080C16 (Abyss)   │
│ Surface (Cards) │ #FFFFFF (White)   │ #121215 (Zinc)    │ #0F172A (Navy)    │
│ Elevated (Rows) │ #F1F5F9 (Slate)   │ #18181B (Zinc)    │ #1E293B (Navy 800)│
│ Border Subtle   │ #E2E8F0           │ #27272A           │ #1E293B / #334155 │
│ Text Primary    │ #0F172A (Slate)   │ #F8FAFC (White)   │ #F8FAFC (White)   │
│ Text Secondary  │ #64748B           │ #A1A1AA           │ #94A3B8           │
│ Brand Accent    │ #7C3AED (Violet)  │ #8B5CF6 (Purple)  │ #818CF8 (Indigo)  │
└─────────────────┴───────────────────┴───────────────────┴───────────────────┘
```

### Signature Brand Accent Rules (Across ALL Themes):
- Primary Action CTA: `bg-violet-600 hover:bg-violet-500 active:scale-95 text-white`
- Active Navigation Item: `text-violet-600 dark:text-violet-400 font-extrabold`
- Active Bottom Nav Dot: `bg-violet-500`
- Active Focus Rings: `focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20`
- Brand Badges: `bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20`

---

## 4. Operational Screen Layouts & Navigation

### Mobile Experience (iPhone / Android)
- **Fixed Bottom Navigation Bar**:
  - `h-16 fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-subtle pb-safe`
  - Max 5 primary tabs with 20px icons and 10px micro-labels.
  - Active tab receives a micro-dot indicator (`w-1.5 h-1.5 rounded-full bg-violet-500`).
  - Active hit area minimum: `48px x 48px`.
- **Main Container Scroll Padding**:
  - Always enforce `pb-24 lg:pb-8` so that list items, pagination buttons, and action triggers are never obscured behind the bottom navigation bar.
- **Mobile Header**:
  - Compact `h-14` header containing: Menu drawer button, Screen Title + Control Pill, Quick Switch Portal link, and Theme Toggle.

### Desktop Experience (1024px+)
- **Fixed Sidebar**: `w-64` or `w-72` with categorized navigation.
- **Top Bar**: Sticky with search, gym location switcher, theme switcher, and notifications.
- **Content Area**: `max-w-7xl mx-auto p-6 sm:p-8 space-y-6`.

---

## 5. Component Standards (CSS & HTML)

### Buttons
```jsx
// 1. Primary Brand CTA (GX Violet)
<button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
  {icon}
  <span>{label}</span>
</button>

// 2. High-Contrast Monochrome (Instagram/Apple style)
<button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
  {icon}
  <span>{label}</span>
</button>

// 3. Secondary Neutral Button
<button className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95 text-slate-700 dark:text-zinc-200 text-xs font-bold border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer">
  {icon}
  <span>{label}</span>
</button>
```

### Segmented Filter Controls
```jsx
<div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-xs font-bold">
  {options.map((opt) => (
    <button
      key={opt.id}
      onClick={() => setFilter(opt.id)}
      className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
        active === opt.id
          ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-black'
          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {opt.label}
    </button>
  ))}
</div>
```

---

## 6. The 6 "AI-Smell" Quality Control Tests

Before shipping any UI code, evaluate against these 6 tests:

| Test | Violation (AI-Smell) | Tier-1 Correction |
|---|---|---|
| **1. Rainbow Cards** | Blue card next to orange card next to green card | All cards neutral canvas; metrics use monochrome + small status dot |
| **2. Brand Mismatch** | Using green buttons when logo is Electric Violet GX | Primary actions use Violet/Purple (`#7C3AED`) matching the GX logo |
| **3. Bloated Boxes** | Huge empty cards with giant padding and tiny text | Compact padding (`p-4`), inline metadata, tight visual rhythm |
| **4. Glow Mud** | `shadow-purple-500/50`, neon borders | 1px clean border with subtle opacity (`border-slate-200` / `border-zinc-800`) |
| **5. Mobile Nav Gap** | Hiding nav on mobile without a bottom bar | Fixed bottom nav (`h-16`) with active dot + slide-over drawer |
| **6. Color Step Bug** | `dark:bg-zinc-850` (invalid Tailwind class) | Valid steps only (`dark:bg-zinc-800` or `dark:bg-zinc-900`) |

---

## 7. Change Log & Governance

- **2026-09-20**: Overhauled UI guide to incorporate **Instagram / Meta / Linear / VS Code Abyss** standards.
- **2026-09-20**: Defined the 4 Secrets of Tier-1 apps, banned bloated boxes, established the **GX Electric Violet** signature accent, and introduced the **Midnight Abyss (Navy Blue)** theme specification.
