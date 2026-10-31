# Contributing to Glitch

Thank you for your interest in contributing to Glitch! We welcome contributions ranging from bug fixes and documentation enhancements to new testing features and design refinements.

Please take a few moments to review these guidelines before submitting a pull request or filing an issue.

---

## Code of Conduct

We expect all contributors to adhere to standard open source community expectations:
- Treat fellow contributors and maintainers with kindness, empathy, and professional courtesy.
- Focus on constructive feedback and maintain an inclusive, welcoming environment for everyone.

---

## Development Workflow

### 1. Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Git**

### 2. Fork and Setup

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/glitch.git
   cd glitch
   ```
3. Install dependencies strictly from the lockfile:
   ```bash
   npm ci
   ```
4. Create a descriptive feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

### 3. Local Development

Run the Next.js development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view your changes with Turbopack fast refresh.

---

## Architecture & Conventions

### Directory Layout

- `src/app/`: Root layout, page routing, and semantic design tokens (`globals.css`).
- `src/components/layout/`: Shell layout, header, drawer wrappers, and logo.
- `src/components/sections/`: Feature-specific modules (conversation, browser, findings, replay, demo-store). Keep CSS co-located with its owning section.
- `src/components/shared/`: Cross-feature UI components (badges, viewers, session dialogs).
- `src/components/ui/`: Atomic, generic primitives (buttons, modals).
- `src/lib/glitch/`: Core state machine, contracts, reducer, and mock agent adapters.
- `src/lib/utils/`: Pure presentation-independent helpers.

### Code Style & Standards

- **TypeScript**: Use strict typing throughout. Avoid using `any`; define explicit interfaces in `src/lib/glitch/types.ts` or local component prop types.
- **Formatting**: Two spaces for indentation, double quotes, and trailing semicolons.
- **Server Components by Default**: Pages and layouts are React Server Components by default. Include `"use client"` only when components require browser APIs, event handlers, or React hooks.
- **Styling**:
  - Use Tailwind CSS 4 utility classes.
  - Adhere to the **Chainroll design system**:
    - `background`: Canvas background.
    - `primary`: Surfaces and secondary card backgrounds.
    - `secondary`: High-contrast text.
    - `accent`: Interactive elements and brand accents.
  - Avoid hardcoding arbitrary hex colors in component files; use semantic CSS custom properties defined in `globals.css`.
- **State Management**:
  - Keep scenario and agent logic outside of presentation components.
  - All workspace state modifications must be dispatched through typed `WorkspaceEvent` objects via the pure reducer in `workspace-state.ts`.
  - Replay snapshots and finding evidence are treated as immutable records.
- **Security & Scope**:
  - Keep real model inference keys, remote browser provisioning, and private credentials out of the frontend repository.

---

## Quality Assurance & Verification

Before opening a pull request, you **must** run the following verification steps locally. All four checks must pass with zero errors:

```bash
# 1. Run ESLint across all files
npm run lint

# 2. Verify TypeScript types and Next.js route types
npm run typecheck

# 3. Run the automated scenario and session lifecycle test suite
npm test

# 4. Confirm an optimized production build compiles cleanly
npm run build
```

If you modify visible UI, verify both **dark** and **light** themes in the browser, along with responsive drawer behavior on small screen viewports.

---

## Submitting a Pull Request

1. **Keep Pull Requests Focused**: Each pull request should address a single concern or feature. Avoid bundling unrelated refactors.
2. **Commit Messages**: Write clear, imperative commit messages (e.g., `Add finding export button`, `Fix replay snapshot timeline scrolling`).
3. **Pull Request Details**:
   - Clearly describe *what* was changed and *why*.
   - Include before/after screenshots or recordings for any UI changes.
   - List the verification commands run and their results.
4. **Respond to Reviews**: Be responsive to feedback and discussions from maintainers.

---

## Reporting Issues

If you find a bug or have a suggestion:
1. Search existing issues to ensure it hasn't already been reported.
2. If opening a new issue, include:
   - A clear, descriptive title.
   - Exact steps to reproduce the behavior.
   - Expected vs. actual results.
   - Your browser version and operating system.

---

Thank you for helping make Glitch better!
