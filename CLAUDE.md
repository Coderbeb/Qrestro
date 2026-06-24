# QRestro Developer Guide

This file provides building, running, coding conventions, features, and design system details for the QRestro platform.

## Development Commands

* **Start Development Server**: `npm run dev`
* **Build Project**: `npm run build`
* **Run Linter**: `npm run lint`
* **Generate Prisma Client**: `npx prisma generate`
* **Push Database Schema**: `npx prisma db push`
* **Seed Database**: `npx prisma db seed` / `npx tsx prisma/seed.ts`

## Tech Stack
* **Framework**: Next.js 16 (App Router + Turbopack)
* **Database / ORM**: PostgreSQL with Prisma
* **Styling**: Tailwind CSS v4 + Custom Theme System (Vanilla CSS Variables)
* **Real-time communication**: Socket.io
* **Authentication**: JWT & bcryptjs

## Completed Features (Available Now)

1. **Authentication**: 
   - Login & Registration for restaurant owners.
   - Password hashing with bcrypt, session tokens with JWT (cookie/header-based).
2. **Super Admin Dashboard** (`/superadmin`):
   - Global statistics (active owners, tables count, total system-wide orders, revenue, active subscription distribution).
   - Restaurant accounts oversight & manual plan tier administration.
3. **Restaurant Owner Dashboard** (`/dashboard`):
   - Real-time analytics (revenue, order counts, average ticket, active table sessions).
   - **Menu Management** (`/dashboard/menu`): Create, update, toggle availability, set prices, preparation times, and categories.
   - **Table & QR Management** (`/dashboard/tables`): Add tables, auto-generate QR codes (supports downloading both SVG and PNG), and set tables active/inactive.
   - **Real-time Order Processing Board** (`/dashboard/orders`): Kanban style view showing order lifecycle status (`Pending` ➜ `Preparing` ➜ `Ready` ➜ `Completed` / `Cancelled`).
   - **Settings** (`/dashboard/settings`): Restaurant name, contact details, owner info, and active subscription profile views.
4. **Customer Menu & Ordering Client** (`/order/[ownerId]/[tableNumber]`):
   - Fully mobile-responsive interface for customers sitting at tables.
   - Browse digital menu by categories, view descriptions, and item availability.
   - Interactive shopping cart and single-tap order placement linked directly to the scanned table.

## Design System & Theme Details

All styling is driven by custom CSS variables defined in [globals.css](file:///k:/Qrestro/src/app/globals.css) with built-in dark/light mode toggle support (`data-theme="dark"`).

### Design Tokens & Aesthetics
* **Theme Preference**:
  - **Light Mode (Default)**: Warm Stone Chalk background (`#fbfbfa`), pure alabaster surfaces (`#ffffff`), soft forest green borders (`rgba(3, 77, 55, 0.06)`), and deep forest charcoal text (`#111c24`).
  - **Dark Mode**: Midnight Forest Black background (`#0a0f0d`), deep jade surfaces (`#111a17`), and soft alabaster text (`#f5f7f6`). Enabled via `data-theme="dark"`.
* **Typography**:
  - Headings & Brand: `Cormorant Garamond` (editorial serif)
  - Body & UI: `Plus Jakarta Sans` (geometric sans-serif)
* **Colors**:
  - Primary Accent: Emerald Forest Green (`--accent: #034d37` in light, `#c5a880` in dark)
  - Secondary Accent: Champagne Gold (`--accent-2: #c5a880` in light, `#056e4e` in dark)
  - Status Indicators:
    - Pending: Warm Orange (`#ea580c`)
    - Preparing: Honey/Amber (`#d97706`)
    - Ready: Basil Green (`#059669`)
    - Completed: Slate Gray (`#64748b`)
    - Cancelled: Red (`#dc2626`)
* **Static Border Radii (Apple-style Squircle)**:
  - Small elements (buttons, input fields): `--radius-sm: 8px`
  - Medium elements (sub-containers, small cards): `--radius-md: 12px`
  - Large elements (main cards, modal boxes): `--radius-lg: 16px`
  - Extra-large elements (large layouts): `--radius-xl: 22px`
* **Animations & Transitions**:
  - Fluid smooth ease-out: `--transition: 0.25s cubic-bezier(0.16, 1, 0.3, 1)`
  - Micro-interaction spring: `--transition-spring: 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`
  - Standard fast: `--transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1)`

### Mobile-First Design Principles
* **Stacked Grid Default**: Grids must default to a 1-column layout (`grid-template-columns: 1fr`) on mobile viewports. Expand to multi-column grids using media queries at `@media (min-width: 768px)`.
* **Full Width Elements**: Buttons, inputs, and card containers must stretch to `width: 100%` on screens `< 768px` to maximize space.
* **Touch-Friendly Targets**: Ensure all clickable elements (buttons, toggle controls, anchor links) have a minimum interactive height/width of `44px`.
* **Overflow Handling**: Tables must be housed in container elements with `overflow-x: auto` to prevent blowing out parent layouts. No horizontal scrollbars are permitted on the HTML/body elements.
* **Responsive Spacing**: Reduce paddings (e.g. from `1.75rem` on desktop to `1rem` on mobile) on cards, panels, and sections on screens `< 768px`.
* **Mobile Sidebar drawer**: Sidebars must transition off-screen using `transform: translateX(-100%)` and slide in smoothly over a backdrop overlay when activated.


## Coding Conventions

### File & Component Structure
* **Component Location**: Reusable UI components (like buttons, dialogs, inputs) go under [src/components/](file:///k:/Qrestro/src/components).
* **Page Layouts**: Route-specific pages and layouts go under [src/app/](file:///k:/Qrestro/src/app).
* **Helper Logic**: Helper functions, middleware, authentication utilities, and custom helpers go in [src/lib/](file:///k:/Qrestro/src/lib).

### Code Style
* **Language**: TypeScript (strict typing, explicit interfaces).
* **Indentation**: 2 spaces.
* **Imports**: ES6 imports using path aliases (e.g. `@/lib/...`).
* **Backend Communication**:
  - Prefer API Route Handlers under `src/app/api/` for backend endpoints.
  - Utilize Next.js 16 Server Actions where they fit well and are supported.
* **Naming**: The official product name is **QRestro**. Do not use "QRBite" in user-facing copy, logs, or comments.

---
See also:
- [AGENTS.md](file:///k:/Qrestro/AGENTS.md) for custom agent instructions and behavioral constraints.
- [design.md](file:///k:/Qrestro/design.md) for full Apple HIG tokens and detailed component design specifications.

