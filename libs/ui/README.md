# @power-market-dashboard/ui

Shared standalone Angular UI components for the Power Market Dashboard.

## Public modules

- Button and icon button
- Card composition primitives
- Status badge
- Theme-aware line and bar charts
- Form layout, select, date/calendar, and number inputs with Signal Forms support
- Dropdown
- Responsive country flags
- Mobile bottom navigation
- Modal primitives and confirmation service
- Skeleton
- Tooltip
- Sonner toaster and service

Import components and providers from `@power-market-dashboard/ui`. The web application loads the accompanying Tailwind v4 theme from `libs/ui/src/css/styles.css`.

Use `provideUiLocale(...)` and `provideUiI18n(...)` to connect the inputs and
calendar to an application's reactive locale and translations.

Regenerate the typed flag manifest and PNG assets with `bun run flags:generate`.

## Validation

Run `bun nx lint ui`, `bun nx test ui`, and `bun nx build ui`.
