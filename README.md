# Evolution Game

Turn-based ecological sandbox simulation built with Next.js, Tailwind CSS, Zustand, SVG hex rendering, and TanStack Table.

## Features
- Hex world generation with configurable map size
- Seasonal simulation (12 turns = 1 year)
- Weather system with wet/dry cycles and climate monitor
- Water hydrology: overflow, flood pulse, runoff, drying, expansion
- Biomass simulation with moisture thresholds and vegetation decay/recovery
- Species table, mutation lab, selected hex inspector
- Auto-advance turns with speed controls
- Zone selector (`rain | normal | dry`) with 5-level climate tuning

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Zustand
- react-zoom-pan-pinch
- TanStack Table

## Quick Start
```bash
npm install
npm run dev
```

Open: `http://localhost:3000` (or next available port shown in terminal)

## Scripts
- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — lint project
- `npm run test` — run automated tests
- `npm run test:watch` — run tests in watch mode

## Project Structure
- `src/app` — Next.js app entry/layout
- `src/components` — UI and simulation view components
- `src/lib` — simulation engine/constants/types
- `src/store` — Zustand game state
- `docs` — PRD, implementation, tracking, testing docs

## Documentation Index
- Product Document: [docs/PRODUCT_DOCUMENT.md](docs/PRODUCT_DOCUMENT.md)
- Implementation Steps: [docs/IMPLEMENTATION_STEPS.md](docs/IMPLEMENTATION_STEPS.md)
- Tracking Document: [docs/TRACKING_DOCUMENT.md](docs/TRACKING_DOCUMENT.md)
- Testing and Tracking: [docs/TESTING_AND_TRACKING.md](docs/TESTING_AND_TRACKING.md)

## License
MIT — see [LICENSE](LICENSE)
