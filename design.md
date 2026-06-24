# QRestro Design System & Apple UI Specifications

This document outlines the concrete design specifications, tokens, and component guidelines for **QRestro**, adhering strictly to Apple's Human Interface Guidelines (HIG) and web-responsive design patterns.

---

## 1. Core Design Tokens (CSS Variables)

We define our theme system using semantic CSS variables, prioritizing a clean, professional **Light Mode** by default, with **Dark Mode** as a togglable override via `[data-theme="dark"]`.

### Theme Colors (Midnight Forest & Champagne Gold Palette)

| CSS Variable | Light Mode (Default) | Dark Mode (`[data-theme="dark"]`) | Description |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#fbfbfa` (Warm Stone Chalk) | `#0a0f0d` (Midnight Forest Black) | Main window/page background |
| `--bg-surface` | `#ffffff` (Pure Alabaster) | `#111a17` (Deep Jade Card) | Cards, sidebars, forms |
| `--bg-elevated` | `#ffffff` | `#1a2622` | Modals, dropdowns, floating menus |
| `--bg-hover` | `rgba(3, 77, 55, 0.05)` | `rgba(197, 168, 128, 0.08)` | Hover highlight backgrounds |
| `--border` | `rgba(3, 77, 55, 0.06)` (Soft Forest tint) | `rgba(255, 255, 255, 0.06)` | Soft separator lines and boundaries |
| `--border-hover` | `rgba(3, 77, 55, 0.15)` | `rgba(255, 255, 255, 0.12)` | Interactive hover borders |
| `--text-primary` | `#111c24` (Deep Forest Charcoal) | `#f5f7f6` (Soft Alabaster) | Header and primary body copy |
| `--text-secondary`| `#556875` (Muted Slate-Forest) | `#ccd4d1` (Muted Jade Gray) | Supporting text and labels |
| `--text-muted` | `#8e9fae` (Muted Slate) | `#687872` (Darker Jade Gray) | Placeholders, disabled states |
| `--accent` | `#034d37` (Emerald Forest Green) | `#c5a880` (Champagne Gold) | Primary interactive controls |
| `--accent-hover` | `#023d2b` | `#b49b70` | Accent hover state |
| `--accent-glow` | `rgba(3, 77, 55, 0.08)` | `rgba(197, 168, 128, 0.2)` | Focus ring and hover highlights |

### Status Colors (Teal & Sea Service Alerts)

| Status | CSS Variable | Color Value (Light) | Color Value (Dark) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Pending / Warm** | `--status-pending` | `#ea580c` (Warm Orange) | `#ff9f0a` | Initial state |
| **Preparing / Cooking** | `--status-preparing`| `#d97706` (Honey/Amber) | `#f59e0b` | Cooking in progress |
| **Ready / Actionable** | `--status-ready` | `#059669` (Basil Green) | `#10b981` | Ready for table service |
| **Completed / Neutral** | `--status-completed`| `#64748b` (Slate Gray) | `#8e8e93` | Order served/closed |
| **Cancelled / Alert** | `--status-cancelled`| `#dc2626` (Red) | `#ef4444` | Cancelled or failed |



---

## 2. Geometry & Corner Styling (Apple Squircle)

Apple products utilize a mathematical superellipse (squircle) for corners. On the web, we achieve a clean approximation of this look by pairing static border-radii with thin, low-opacity borders.

```css
/* Static Apple border radii variables */
:root {
  --radius-sm: 8px;   /* Small elements: buttons, badges, selectors */
  --radius-md: 12px;  /* Standard elements: inputs, small cards, lists */
  --radius-lg: 16px;  /* Large components: main cards, tables, dashboards */
  --radius-xl: 22px;  /* Outer panels: modals, menus, sidebar drawers */
}
```

### Inner-to-Outer Corner Relationship
To maintain visual harmony, child elements within a card must have a smaller border-radius than their parent:
$$\text{Radius}_{\text{child}} = \text{Radius}_{\text{parent}} - \text{Padding}$$
For example, if a Card has `--radius-lg` (16px) and padding of `8px`, the internal image/button must have `--radius-sm` (8px) to keep a uniform curved border gap.

---

## 3. Apple-Style Button Specifications

We implement four functional button variants to establish clear visual hierarchy:

```css
/* Base Button Styling (Touch target height: 44px) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px; /* Apple minimum touch target */
  padding: 0 16px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 0.9rem;
  border: 1px solid transparent;
  transition: var(--transition);
  cursor: pointer;
  user-select: none;
}
.btn:active {
  transform: scale(0.97); /* Apple tap-down effect */
}
```

### 1. Prominent (Filled) Button
Used for the primary action on a screen (e.g. "Place Order", "Save Changes").
- **Light Theme**: Solid `--accent` background (`#034d37`), white text.
- **Dark Theme**: Solid `--accent` background (`#c5a880`), dark text.
- **CSS**:
  ```css
  .btn-primary {
    background-color: var(--accent);
    color: #ffffff;
  }
  .btn-primary:hover {
    background-color: var(--accent-hover);
  }
  ```

### 2. Tinted Button
Used for supporting actions that are still prominent (e.g. "Add to Cart", "View Details").
- **Light Theme**: `rgba(3, 77, 55, 0.08)` background, `--accent` text.
- **Dark Theme**: `rgba(197, 168, 128, 0.15)` background, `--accent` text.
- **CSS**:
  ```css
  .btn-tinted {
    background-color: var(--accent-glow);
    color: var(--accent);
  }
  .btn-tinted:hover {
    background-color: rgba(3, 77, 55, 0.15);
  }
  ```

### 3. Gray Button
Used for neutral secondary choices (e.g. "Cancel", "Back").
- **Light Theme**: Soft slate gray background (`rgba(71, 85, 105, 0.1)`), dark text (`#0f172a`).
- **Dark Theme**: Soft dark gray background (`rgba(255, 255, 255, 0.08)`), light text (`#fafaf9`).
- **CSS**:
  ```css
  .btn-gray {
    background-color: rgba(71, 85, 105, 0.12);
    color: var(--text-primary);
  }
  .btn-gray:hover {
    background-color: rgba(71, 85, 105, 0.2);
  }
  ```



### 4. Borderless Button
Used for tertiary navigation or secondary controls.
- **Styling**: No background, accent-colored text. Light gray highlight on hover.
- **CSS**:
  ```css
  .btn-borderless {
    background-color: transparent;
    color: var(--accent);
  }
  .btn-borderless:hover {
    background-color: var(--bg-hover);
  }
  ```

---

## 4. Form Fields & Input Fields

Apple inputs use subtle background fills and active focus rings rather than heavy borders.

*   **Height**: Must be exactly `44px` for easy tap interaction on mobile.
*   **Background Fill**: `rgba(0, 0, 0, 0.03)` (Light Mode) or `rgba(255, 255, 255, 0.04)` (Dark Mode) for flat, clean form sections.
*   **Focus Ring**: A thin border color shift paired with a soft drop shadow glow.
*   **CSS Example**:
    ```css
    .input-field {
      height: 44px;
      padding: 0 14px;
      background-color: rgba(120, 120, 128, 0.06);
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.95rem;
      transition: var(--transition);
      outline: none;
    }
    .input-field:focus {
      background-color: var(--bg-surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    ```

---

## 5. Animations & Transitions (Apple Fluidity)

Apple designs feel alive and responsive. We use specific cubic-bezier curves for transitions to mimic physical springs.

### 1. The Fluid Glide (`--transition`)
Used for general hover states, sidebar slide-ins, and color changes.
- **Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (Ultra-smooth ease-out).
- **Duration**: `0.3s`.

### 2. The Spring Bounce (`--transition-spring`)
Used for button clicks, model scales, active toggles, and shopping cart additions.
- **Curve**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (Playful elastic response).
- **Duration**: `0.5s`.

---

## 6. Mobile-First & Touch Target Compliance

Every view must be styled from a mobile screen size upwards.

1.  **Touch Targets**:
    - All interactive elements must maintain a minimum height/width of `44px`.
    - Spacing between adjacent buttons must be at least `8px` to prevent mis-taps.
2.  **Stacked Grids**:
    - Grid layouts must stack into a single column (`1fr`) by default.
    - Medium-sized cards, menus, and forms expand to `2` columns at `@media (min-width: 768px)` (tablets) and `3` or more columns at `@media (min-width: 1024px)` (desktops).
3.  **Horizontal Containment**:
    - Tables must sit in containers with `overflow-x: auto` so they can be swiped sideways instead of forcing the browser viewport to stretch horizontally.
    - Inputs and buttons must adjust to `width: 100%` on mobile screens.
4.  **Sticky Bottom Action Bars**:
    - The customer ordering cart checkout uses a `position: sticky; bottom: 0;` action bar, ensuring checkout controls are always reachable by the user's thumb without scrolling.
