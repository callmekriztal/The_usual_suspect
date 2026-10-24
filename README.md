# The usual suspect
> *Every case needs a suspect.*

## Overview
A single-page browser mystery game. You sit at a laptop with a case file: `CASE_09, subject Nila, status MISSING, last contact 23:41`. You investigate using realistic surveillance tools: terminal logs, timeline message scrubbing, audio tuning, and metadata inspection.

## Tech Stack
- **Build**: Vite + TypeScript
- **UI**: Vanilla DOM + CSS
- **Evidence Board**: SVG
- **Effects**: Canvas 2D (oscilloscope & pixel dissolve)
- **Audio**: Web Audio API
- **Testing**: Vitest & Playwright

## Development & Verification
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Typecheck and build static distribution
- `npm test` - Run Vitest test suite
- `npm run typecheck` - Run TypeScript compiler checks
