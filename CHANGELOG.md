# Changelog

## v1.1.5 - 2026-05-05

- Added mouse resizing for the left sidebar with persisted custom width.
- Kept the existing collapse/expand behavior while allowing adjustable panel sizes.
- Updated visible version labels to `1.1.5`.

## v1.1.4 - 2026-05-05

- Added a collapsible left sidebar for a wider workspace view.
- Persisted the sidebar expanded/collapsed preference in the browser.
- Added API test scaffolding changes already present locally to this backup version.
- Updated visible version labels to `1.1.4`.

## v1.1.3 - 2026-05-05

- Added drag-and-drop support for moving Kanban cards between status columns.
- Moving a card now updates the lead status through the API and refreshes dashboard metrics.
- Updated visible version labels to `1.1.3`.

## v1.1.2 - 2026-05-05

- Improved wide-screen responsiveness for the Kanban board.
- Expanded the main workspace and made Kanban columns fluid on desktop.
- Updated visible version labels to `1.1.2`.

## v1.1.1 - 2026-05-05

- Added top circular dashboard charts for total leads and lead status distribution.
- Aligned visible version labels across the CRM and external client.

## v1.1.0 - 2026-05-04

- Added Kanban board view: leads are displayed as cards grouped into 5 status columns (Nuevo, Contactado, Calificado, Convertido, Perdido), each with a distinct color theme.
- Added Lista / Kanban view toggle in the leads panel header; preference persists via `localStorage`.
- Status filters are automatically hidden in Kanban mode (each column acts as its own filter).
- Edit and Delete actions remain available on hover for each Kanban card.

## v1.0.3 - 2026-05-05

- Updated the left sidebar block to use a dark violet theme.
- Updated visible version labels to `1.0.3`.

## v1.0.2 - 2026-05-05

- Updated the CRM palette to use stronger purple and pink accents.
- Moved the visible version label under the main page title.
- Updated local and external version labels to `1.0.2`.

## v1.0.1 - 2026-05-04

- Added visible version labels to the internal CRM and external client.
- Added `GET /api/version` to report the running app version locally.
- Prepared the project for identifiable Git commits and GitHub version tags.

## v1.0.0 - 2026-05-04

- Initial MiniCRM Leads app with Express, SQLite, lead CRUD, and local clients.
