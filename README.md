# Glitch

<div align="center">

**A modern AI browser testing workspace built for Google’s Gemma.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![daisyUI](https://img.shields.io/badge/daisyUI-v5-5A0EF8?style=flat)](https://daisyui.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](#license)

</div>

---

## Overview

**Glitch** is an interactive, browser-driven testing workspace designed to demonstrate autonomous QA testing workflows powered by Google's **Gemma** model family.

Instead of writing brittle assertion scripts by hand, a developer gives Glitch high-level goals (e.g., *"Test the checkout flow. Try rapid submissions and inspect whether submitting twice generates duplicate orders"*). Glitch navigates the application, interacts with UI controls, detects anomalies, generates reproducible finding reports, and captures immutable snapshot evidence for full time-travel replay.

This frontend demonstration is completely client-side and self-contained—requiring **no external credentials, headless browser provisioning, or remote API keys** to run.

---

## Key Features

- **Interactive AI Conversation Shell**: Centered start screen with prompt suggestions, instant mission dispatch, and real-time execution streaming.
- **Embedded Browser Preview**: Responsive split workspace featuring an interactive sample storefront (`Demo Store`) with an intentional race-condition checkout bug.
- **Dynamic Agent Action Replay**: Real-time event timeline visualizing each agent decision (`observe`, `act`, `verify`).
- **Time-Travel Snapshot Inspection**: Read-only historical replay for inspecting exact DOM, cart, and order state at every step.
- **Manual Takeover & Handback**: Pause agent automation, take direct manual control of the browser viewport to test hypotheses, and seamlessly hand control back to the agent.
- **Finding Evidence Generation**: Automatic diagnosis of reproducible defects with full steps to reproduce, expected vs. actual behavior, and linked order evidence.
- **Zero-Config Local Persistence**: Session state, replay histories, and findings persist safely in `localStorage` with strict session isolation and memory fallback.
- **Chainroll Design System**: Tokenized dark and light themes, custom Satoshi typography, accessible contrast standards, and responsive mobile drawers.

---

## Quick Start

### Prerequisites

- **Node.js**: v20.0.0 or higher
- **Package Manager**: `npm` (v10+ recommended)

### Installation

Clone the repository and install dependencies from the lockfile:

```bash
git clone https://github.com/your-username/glitch.git
cd glitch
npm ci
```

### Running Locally

Start the Next.js development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local dev server on `http://localhost:3000` |
| `npm run build` | Compiles a production build and verifies route types |
| `npm start` | Serves the production build locally |
| `npm run lint` | Runs ESLint 9 across all project files |
| `npm run typecheck` | Generates Next.js route types and runs TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Runs the full scenario, session lifecycle, and persistence test suite using Node and `tsx` |

---

## Exploring the Demo Walkthrough

1. **Launch a Test**: From the welcome screen, select one of the shortcut pills (e.g. *Checkout Flow* or *Double Submit*) or type your own mission and press `Enter`.
2. **Observe the Agent**: The browser drawer opens automatically. Watch Glitch inspect product cards, add an item to the bag, navigate to checkout, and test double-submission behavior.
3. **Take Control**: Click **Pause** or **Take control** in the browser header. Add items, adjust customer inputs directly in the storefront, and then click **Resume** or return control to the agent.
4. **Inspect Findings**: Open the **Findings** tab to review the detected issue report (*"Repeated checkout submission creates duplicate orders"*).
5. **Time-Travel Replay**: Click **Open replay** on any finding to step through previous actions and inspect snapshot state at that exact millisecond.
6. **Switch Sessions**: Use the header navigation to review previous sessions or start a clean workspace.

---

## Project Structure

```text
glitch/
├── public/                 # Static assets, fonts, and sample product imagery
│   └── fonts/              # Satoshi variable font family
├── src/
│   ├── app/                # Next.js App Router root layout, tokens, and page
│   │   ├── globals.css     # Semantic theme tokens, Tailwind v4 theme mappings
│   │   ├── layout.tsx      # Root document, metadata, and font declarations
│   │   └── page.tsx        # Thin entry point rendering GlitchWorkspace
│   ├── components/
│   │   ├── layout/         # Application shell, header, navigation, and logo
│   │   ├── sections/       # Feature UI panels
│   │   │   ├── browser/    # Browser workspace, URL bar, manual control bar
│   │   │   ├── conversation/# Chat panel, composer, suggestions, target selector
│   │   │   ├── demo-store/ # Embedded mock e-commerce store with intentional bugs
│   │   │   ├── findings/   # Defect diagnosis and reproduction report views
│   │   │   ├── replay/     # Time-travel snapshot timeline and diff inspector
│   │   │   └── workspace/  # Top-level split workspace orchestrator
│   │   ├── shared/         # Reusable application UI, status badges, dialogs
│   │   └── ui/             # Generic primitives (buttons, modals, dialogs)
│   └── lib/
│       ├── glitch/         # Agent adapter, state reducer, contracts, test suite
│       │   ├── demo-store.ts      # Store state and order processing logic
│       │   ├── mock-agent.ts      # Scripted scenario steps and event adapter
│       │   ├── types.ts           # Shared TypeScript contracts and interfaces
│       │   ├── use-workspace.ts   # React hook for session orchestration
│       │   ├── workspace-state.ts # Single immutable event reducer
│       │   └── *.test.ts          # Comprehensive unit and integration test suite
│       └── utils/          # Formatting and time calculation helpers
├── AGENTS.md               # Behavioral constraints and coding rules for AI agents
├── CONTRIBUTING.md         # Guidelines for human contributors
└── package.json            # Dependencies, scripts, and engine specifications
```

---

## Technical Architecture

```
                  ┌─────────────────────────────────────────┐
                  │              User / Prompt              │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Conversation Panel            │
                  │   (Composer, Suggestions, Chat Stream)  │
                  └────────────────────┬────────────────────┘
                                       │  WorkspaceEvent (session.send)
                                       ▼
┌──────────────────┐  AgentEvent   ┌────────────────────────┐  State Update   ┌──────────────────┐
│    Mock Agent    │ ────────────> │  workspace-state.ts    │ ──────────────> │ React Workspace  │
│  (Gemma Adapter) │               │ (Single Event Reducer) │                 │      State       │
└──────────────────┘               └────────────────────────┘                 └─────────┬────────┘
                                               ▲                                        │
                                               │ WorkspaceEvent (session.control)       ▼
                                   ┌────────────────────────┐                 ┌──────────────────┐
                                   │  use-workspace Hook    │ <────────────── │  localStorage    │
                                   │ (Timers & Persistence) │                 │   Persistence    │
                                   └────────────────────────┘                 └──────────────────┘
```

### State Machine & Event Architecture

- **`types.ts`**: Canonical definitions for `Session`, `WorkspaceEvent`, `AgentEvent`, `Finding`, `AgentAction`, and `ReplayStep`.
- **`workspace-state.ts`**: Pure reducer function handling every session transition. All state modifications flow through typed `WorkspaceEvent` dispatches.
- **`mock-agent.ts`**: Cancellable agent adapter emitting typed `AgentEvent` objects over simulated network delays. Designed as a drop-in replacement for live Gemma / Playwright event streams.
- **`use-workspace.ts`**: Manages adapter subscription lifecycle, automatic timer cancellation on pause/unmount, and resilient `localStorage` synchronization.

---

## Future Integrations & Roadmap

- [ ] **Real Model Inference**: Connect live Google Gemma endpoints via WebGPU or backend server orchestration.
- [ ] **Remote Browser Provisioning**: Integrate with Playwright / CDP (Chrome DevTools Protocol) for driving arbitrary public web applications.
- [ ] **Network & Console Capture**: Enrich findings with live HAR network traces, console errors, and stack traces.
- [ ] **Automated Test Generation**: Export reproducible findings into executable Playwright or Cypress test scripts.

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our workflow, style guides, and testing requirements.

---

## License

This project is licensed under the [MIT License](LICENSE).
