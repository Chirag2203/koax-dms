# Design System Specification: High-Density Luxury Automotive Operations

## 1. Overview & Creative North Star: "The Precision Concierge"
This design system is engineered for high-stakes operational precision. In the world of luxury pre-owned assets, information density must not come at the cost of elegance. Our Creative North Star is **"The Precision Concierge"**—a system that feels like a bespoke mechanical watch: complex, high-density, yet remarkably legible and authoritative.

We move beyond the "SaaS template" by utilizing **Tonal Layering** and **Information Architecture Hierarchy**. We reject the "boxed-in" look of standard CRM tools. Instead of using lines to separate data, we use intentional shifts in surface luminance and "Ghost Borders" to create a seamless, editorial flow that allows staff to parse VINs, valuations, and logistics at the speed of thought.

---

## 2. Color Theory & Surface Logic
The palette is rooted in deep obsidian and crisp whites, utilizing a "Dark First" philosophy to reduce eye strain for operators managing inventory throughout the day.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts. 
- Use `surface_container_low` for the base canvas.
- Use `surface_container` for primary work areas.
- Use `surface_container_highest` for active selection states or high-priority focus areas.

### Surface Hierarchy (Nesting)
Treat the UI as a physical stack of luxury materials. 
*   **Level 0 (Canvas):** `#0A0A0A` (Dark) / `#FBFBFA` (Light). This is the base floor.
*   **Level 1 (Sidebar/Top Bar):** `surface_container_low`.
*   **Level 2 (Main Card/Table Area):** `surface_container`.
*   **Level 3 (Modals/Popovers):** `surface_container_high` with a 12px blur.

### Glass & Gradient Implementation
To achieve a "Stripe-level" polish, use a subtle 10% opacity linear gradient on primary CTAs (`primary` to `primary_container`). For floating Command Palettes, use a 70% opacity `surface` color with a `24px` backdrop-blur to create a "frosted glass" depth that keeps the operator grounded in their current context.

---

## 3. Typography: The Editorial Edge
We utilize a dual-font system to separate "Administrative Language" from "Operational Data."

*   **Primary: Inter (Sans)**
    *   **Headline/Title:** 500-600 Weight. Tight letter-spacing (-0.02em) for a modern, compact feel.
    *   **Body:** 400 Weight. Standard tracking for readability.
*   **Secondary: IBM Plex Mono (Data Mono)**
    *   Used exclusively for **VINs, Inventory IDs, Indian Monetary Grouping (₹), and Keyboard Shortcuts.** 
    *   *Rationale:* Monospace ensures that digits align vertically in data tables, allowing staff to compare valuations like `₹ 1,28,50,000` and `₹ 1,12,00,000` instantly.

---

## 4. Elevation & Depth: Tonal Layering
We define depth through light, not shadows.

*   **The Layering Principle:** A card does not sit "on top" with a shadow; it exists as a "raised surface." Place a `surface_container_highest` card on a `surface_container_low` background. 
*   **Ambient Shadows:** For floating elements like the Command Palette, use an ultra-diffused shadow: `box-shadow: 0 20px 50px rgba(0,0,0, 0.3)`. The shadow should feel like a soft glow of darkness, never a harsh line.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., input fields), use the `outline_variant` at 15% opacity. It should be felt, not seen.

---

## 5. Components: Operational Primitives

### High-Density Data Tables
*   **Row Height:** 36px (Compact) or 44px (Standard).
*   **Separation:** No horizontal lines. Use `surface_container_low` on hover for the entire row.
*   **Data Alignment:** Currency and IDs must be in `IBM Plex Mono`, right-aligned for numerical comparison.

### The Command Palette (560px)
*   **Width:** Fixed at 560px.
*   **Position:** Center-top, 12% from the top margin.
*   **Styling:** 12px radius, `surface_bright` background, 20px backdrop-blur. Use `label-sm` for shortcut hints (e.g., `⌘K`).

### Buttons & Inputs
*   **Radius:** 6px (Slightly sharp, professional).
*   **Primary Button:** `primary` background with `on_primary` text. No border.
*   **Secondary Button:** `surface_container_highest` background. No border.
*   **Input Fields:** `surface_variant` background, 6px radius. The active state uses a 1px `accent` ghost border (20% opacity).

### Specialized Components
*   **VIN Chip:** 4px radius, `IBM Plex Mono`, `surface_container_highest` background.
*   **Status Indicators:** Small 6px solid dots using `error` or `primary` colors; avoid large, bulky status badges.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `₹ 00,00,000` formatting for all vehicle pricing to match Indian accounting standards.
*   **Do** use `1.5px` stroke for Lucide icons to maintain a "light" airy feel amidst high data density.
*   **Do** lean into asymmetry. A 220px sidebar balanced against a high-density right-aligned data panel creates a sophisticated, "Pro-App" look.

### Don’t
*   **Don't** use 100% black `#000000` for backgrounds (unless in `surface_container_lowest`). Use the Canvas/Surface tokens for a softer, premium dark mode.
*   **Don't** use serifs. This is a tool of precision and modern engineering.
*   **Don't** use dividers between list items. Use 8px or 12px of vertical white space to let the data breathe.
*   **Don't** use decorative car imagery. The tool is for operators who know the product; the data is the hero.

---

## 7. Spacing Scale
The system operates on a **4px baseline grid.**
- **Internal Padding:** 8px, 12px, 16px.
- **Section Gaps:** 24px, 32px.
- **Sidebar Width:** 220px.
- **Top Bar Height:** 48px.

*Note: All components must snap to the 4px grid to ensure the "Raycast-style" alignment remains perfect across all screen resolutions.*