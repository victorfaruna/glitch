# Agent instructions

## Project

Glitch uses the Next.js App Router, React, TypeScript, Tailwind CSS 4, daisyUI,
and Lucide icons. It is a browser testing workspace built for Gemma.
Use npm and keep `package-lock.json` in sync with dependency changes.
The current product is a client-side, scripted demo. Keep real inference,
remote browser provisioning, and credentials out of the frontend.

## Structure

- `src/app/page.tsx`: the `/` route.
- `src/app/layout.tsx`: the root document and shared metadata.
- `src/app/globals.css`: semantic light/dark tokens, Tailwind mappings, base styles, and reusable design helpers.
- `src/components/layout/`: workspace shell, header, navigation, and resizing.
- `src/components/sections/`: feature UI grouped into workspace, conversation, browser, demo-store, findings, and replay.
- `src/components/shared/`: reusable application UI, viewer, status, theme control, and session dialogs.
- `src/components/ui/`: generic primitives such as icon buttons and dialogs.
- `src/lib/hooks/`: reusable UI hooks, including persisted theme selection.
- `src/lib/utils/`: presentation-independent formatting helpers.
- `src/lib/glitch/types.ts`: shared session, event, and evidence contracts.
- `src/lib/glitch/mock-agent.ts`: the replaceable agent adapter and scenario.
- `src/lib/glitch/workspace-state.ts`: the single event reducer and fixtures.
- `src/lib/glitch/use-workspace.ts`: subscription, persistence, and timer lifecycle.
- `public/`: static assets, when needed.
- `next.config.ts`: Next.js and Tailwind's Turbopack integration.
- `@/*`: import alias for `src/*`.

## Commands

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start the development server at `http://localhost:3000`.
- `npm run lint`: run ESLint.
- `npm run typecheck`: generate Next.js route types and check TypeScript.
- `npm test`: run the scenario and session lifecycle tests with Node and tsx.
- `npm run build`: create a production build and check TypeScript types.
- `npm start`: serve an existing production build.

## Conventions

- Keep changes focused on the requested work. Avoid unnecessary dependencies.
- Use TypeScript, two-space indentation, double quotes, and semicolons.
- Keep pages and layouts as Server Components by default. Add `"use client"`
  only where state, event handlers, or browser APIs require it.
- Use Tailwind utilities for styling and keep global CSS minimal.
- Follow the Chainroll design conventions: `background` is the canvas,
  `primary` is a surface, `secondary` is text, and `accent` is brand color.
  Use the tokens in `globals.css` for both light and dark themes; keep
  feature-specific CSS beside its owning component. The embedded demo store
  has its own isolated visual identity.
- Keep routes thin. Put shell composition in `layout/`, feature sections in
  `sections/`, application-wide pieces in `shared/`, and generic primitives
  in `ui/`. Keep shared components independent of feature sections.
- Use semantic HTML, accessible names, and keyboard-friendly controls when
  adding interactive UI.
- Define page titles and descriptions through the Next.js Metadata API.
- Keep scenario logic outside presentation components. Update session data
  through `WorkspaceEvent`; adapters emit typed `AgentEvent` values.
- Keep requested custom URLs distinct from the actual Demo Store preview.
- Preserve pause, manual handback, session isolation, and timer cancellation.
- Treat replay snapshots as immutable evidence. Label mock data clearly.
- Do not edit generated files in `.next/`, `node_modules/`, or `next-env.d.ts`.
- Never commit secrets, `.env` files, or build output.

## Validation

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
after code changes. Check affected routes in the browser when changing visible
UI. Report any checks that could
not run and why. Keep this file current when project commands or structure
change, and preserve the managed Next.js instructions below.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
