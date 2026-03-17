# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bill Splitter — a Next.js 16 web app (App Router) using React 19, TypeScript, and Tailwind CSS v4. Users enter a total bill amount and split it among a dynamic list of people, each with a name and customizable percentage. By default, the bill is split evenly.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — run ESLint (flat config with Next.js core-web-vitals + TypeScript rules)

## Architecture

- **App Router**: all routes live under `app/`. `layout.tsx` is the root layout; `page.tsx` is the home page.
- **Styling**: Tailwind CSS v4 via PostCSS. Global styles in `app/globals.css`. Geist font loaded via `next/font/google`.
- **Path aliases**: `@/*` maps to the project root (configured in `tsconfig.json`).
- **TypeScript**: strict mode enabled.
