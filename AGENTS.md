<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# QRestro Agent Guidelines

You must follow these rules without exception:

## Product Name
- The official product name is **QRestro**. Always ensure user-facing strings, logs, page titles, and comments refer to the system as **QRestro** (never *QRBite*).

## Code Style & Architecture
- Use TypeScript with explicit types (avoid `any` where possible).
- Indentation: Use 2 spaces.
- ES6 imports/exports using path aliases (e.g. `@/lib/...`).
- Custom reusable components go in the `src/components/` directory.
- Prefer API Route Handlers in `src/app/api/` for backend features.
- Support Server Actions if they are stable/suitable for the feature.

## Design System & Responsiveness
- **Default Theme**: Light theme is the default. Dark theme is the override activated via `[data-theme="dark"]`. Never set dark theme as the default stylesheet root.
- **Apple curves**: Use static border-radii values defined in `globals.css` (`var(--radius-sm)`, `var(--radius-md)`, `var(--radius-lg)`, `var(--radius-xl)`). Avoid ad-hoc pixel values or browser-default curves.
- **Mobile-First Layouts**: Always write layout styles so they stack on mobile by default and expand on tablet/desktop viewports via media queries (`@media (min-width: 768px)`).
- **Touch Targets**: Ensure touch targets for interactive elements are at least `44px`.
- **Animations**: Use the fluid cubic-bezier animations defined in variables (`var(--transition)`) for all element transitions.

## Critical Instructions
- Do NOT modify or delete the Next.js rules block (`<!-- BEGIN:nextjs-agent-rules -->` ... `<!-- END:nextjs-agent-rules -->`) at the top of this file.

