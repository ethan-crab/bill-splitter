# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bill Splitter — a Next.js 16 web app (App Router) using React 19, TypeScript, and Tailwind CSS v4. Users enter a total bill amount and split it among a dynamic list of people, each with a name and customizable percentage. Supports two split modes: percentage-based and itemized (drag-and-drop assignment). Multi-currency support (USD, JPY, CNY, PHP).

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — run ESLint (flat config with Next.js core-web-vitals + TypeScript rules)

No test framework is configured.

## Architecture

- **App Router**: all routes live under `app/`. `layout.tsx` is the root layout; `page.tsx` is the home page.
- **Single-component app**: all logic lives in `app/page.tsx` (~590 lines, `"use client"`). There are no separate component files. Key interfaces (`Person`, `BillItem`, `Currency`) and all state/handlers are defined in this one file.
- **State management**: React `useState` + `useCallback` only. No external state libraries. Module-level counters (`nextPersonId`, `nextItemId`) for generating unique IDs.
- **Two split modes**: `mode` state toggles between `"percentage"` (divide bill by percent per person) and `"itemized"` (assign individual bill items to people via drag-and-drop).
- **Styling**: Tailwind CSS v4 via PostCSS. Global styles in `app/globals.css`. Light/dark mode via CSS custom properties and `prefers-color-scheme`. Geist font loaded via `next/font/google`.
- **Path aliases**: `@/*` maps to the project root (configured in `tsconfig.json`).
- **TypeScript**: strict mode enabled.
