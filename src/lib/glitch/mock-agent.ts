import { DEMO_CUSTOMER, emptyStore, settleOrders } from "./demo-store";
import type { ActionTarget, AgentAction, AgentAdapter, AgentEvent, DemoStoreState, Finding, Session } from "./types";

interface ScenarioStep {
  label: string;
  detail: string;
  phase: AgentAction["phase"];
  target?: ActionTarget;
  delay: number;
  apply(store: DemoStoreState): DemoStoreState;
}

const checkoutCart = [{ productId: "tote", quantity: 1 }];

export const CHECKOUT_SCENARIO: readonly ScenarioStep[] = [
  { label: "Opening Demo Store", detail: "Starting in the local sample storefront. No external website is connected.", phase: "act", delay: 700, apply: () => emptyStore() },
  { label: "Inspecting checkout controls", detail: "The storefront has product cards, a shopping bag, and a checkout form.", phase: "observe", target: "product", delay: 1000, apply: (s) => ({ ...s, page: "products" }) },
  { label: "Adding an item to the bag", detail: "Added one Everyday tote ($32.00) as a repeatable test cart.", phase: "act", target: "product", delay: 1100, apply: (s) => ({ ...s, page: "products", cart: checkoutCart }) },
  { label: "Opening the shopping bag", detail: "Inspecting the current cart and its subtotal before continuing to checkout.", phase: "observe", target: "cart", delay: 1000, apply: (s) => ({ ...s, page: "cart", cart: s.cart.length ? s.cart : checkoutCart }) },
  { label: "Opening checkout", detail: "Continuing with the current cart. The test uses synthetic customer details.", phase: "act", target: "checkout", delay: 1100, apply: (s) => ({ ...s, page: "checkout", cart: s.cart.length ? s.cart : checkoutCart }) },
  { label: "Filling customer details", detail: "Entered Alex Morgan, alex@example.test, and a fictional delivery address.", phase: "act", target: "customer", delay: 1200, apply: (s) => ({ ...s, page: "checkout", cart: s.cart.length ? s.cart : checkoutCart, customer: { ...DEMO_CUSTOMER } }) },
  { label: "Submitting the order", detail: "The first submission is pending. Watching the loading state.", phase: "act", target: "submit", delay: 1100, apply: (s) => ({ ...s, page: "checkout", cart: s.cart.length ? s.cart : checkoutCart, customer: { ...DEMO_CUSTOMER, ...Object.fromEntries(Object.entries(s.customer).filter(([, value]) => value.trim())) }, submitting: true, pendingSubmissions: 1 }) },
  { label: "Testing repeated submission", detail: "Submitted again while the first request was still pending. The button accepts both clicks.", phase: "act", target: "submit", delay: 1400, apply: (s) => ({ ...s, page: "checkout", cart: s.cart.length ? s.cart : checkoutCart, customer: s.customer.email ? s.customer : { ...DEMO_CUSTOMER }, submitting: true, pendingSubmissions: 2 }) },
  { label: "Checking the result", detail: "Two order records were created for the same cart and customer in one checkout attempt.", phase: "verify", target: "confirmation", delay: 1300, apply: (s) => settleOrders({ ...s, cart: s.cart.length ? s.cart : checkoutCart, customer: s.customer.email ? s.customer : { ...DEMO_CUSTOMER }, submitting: true, pendingSubmissions: 2 }) },
  { label: "Preparing a reproduction", detail: "Resetting to one tote and the same synthetic customer. Previous order evidence is retained.", phase: "act", target: "checkout", delay: 1400, apply: (s) => ({ ...s, page: "checkout", cart: checkoutCart, customer: { ...DEMO_CUSTOMER }, attempt: 2, submitting: false, pendingSubmissions: 0, error: null }) },
  { label: "Reproducing repeated submission", detail: "Repeated the two-click submission with the same $32.00 cart.", phase: "act", target: "submit", delay: 1200, apply: (s) => ({ ...s, page: "checkout", cart: checkoutCart, customer: { ...DEMO_CUSTOMER }, attempt: 2, submitting: true, pendingSubmissions: 2 }) },
  { label: "Confirming the duplicate orders", detail: "A second pair of order records confirms the sample issue is reproducible.", phase: "verify", target: "confirmation", delay: 1400, apply: (s) => settleOrders({ ...s, cart: checkoutCart, customer: { ...DEMO_CUSTOMER }, attempt: 2, submitting: true, pendingSubmissions: 2 }) },
];

export const SCENARIO_LENGTH = CHECKOUT_SCENARIO.length;

export function createFinding(session: Session): Finding {
  const resultActions = session.actions.filter((action) => action.id.endsWith("-8") || action.id.endsWith("-11"));
  // Use recorded evidence, even if a developer changed or reset the live
  // preview after the verification step while holding manual control.
  const evidence = [...new Map(session.replay
    .filter((step) => resultActions.some((action) => action.id === step.id))
    .flatMap((step) => step.snapshot.orders)
    .filter((order) => order.attempt === 1 || order.attempt === 2)
    .map((order) => [`${order.attempt}-${order.id}`, order] as const)).values()];
  return {
    id: `${session.id}-finding-${session.run}`,
    title: "Repeated checkout submission creates duplicate orders.",
    severity: "high", status: "confirmed",
    explanation: "The demo checkout accepts another submission while the first is still processing. Each accepted submission creates a separate order. A second checkout attempt reproduces the issue.",
    expected: "A checkout attempt creates one order. Additional clicks during processing are ignored or deduplicated.",
    actual: `${evidence.length} demo order records were created: ${evidence.filter((o) => o.attempt === 1).length} in the first checkout attempt and ${evidence.filter((o) => o.attempt === 2).length} in the reproduction. Repeated submissions created separate orders for the same cart.`,
    steps: [
      "Open Demo Store and add an Everyday tote to the bag.",
      "Continue to checkout and enter the synthetic customer details.",
      "Click Place order, then click it again while Processing is shown.",
      "Observe two order records for the same checkout attempt.",
      "Repeat with a fresh one-item cart to confirm the issue.",
    ],
    evidence, relatedActionIds: resultActions.map((action) => action.id),
    replayStepId: resultActions[0]?.id ?? session.replay[0]?.id ?? "",
  };
}

export function makeStepEvent(session: Session, timestamp: string): AgentEvent | null {
  const step = CHECKOUT_SCENARIO[session.cursor];
  if (!step) return null;
  const action: AgentAction = {
    id: `${session.id}-run-${session.run}-${session.cursor}`,
    label: step.label, detail: step.detail, target: step.target, phase: step.phase, timestamp,
  };
  const browser = step.apply(session.browser);
  return {
    type: "agent.step", cursor: session.cursor + 1, action, browser,
    replay: { id: action.id, action, snapshot: structuredClone(browser), viewport: session.viewport },
  };
}

// The only scheduled behavior lives here. A future adapter can emit the same
// events from Gemma / Playwright / a browser-stream provider.
export function createMockAgent({ getSession, emit, scheduler = defaultScheduler }: {
  getSession(): Session;
  emit(event: AgentEvent): void;
  scheduler?: { set(callback: () => void, delay: number): unknown; clear(handle: unknown): void };
}): AgentAdapter {
  let handle: unknown = null;
  let active = false;
  let cancelled = false;
  let generation = 0;

  function schedule() {
    if (!active || cancelled || handle !== null) return;
    const token = generation;
    const session = getSession();
    const delay = CHECKOUT_SCENARIO[session.cursor]?.delay ?? 800;
    handle = scheduler.set(() => {
      if (!active || cancelled || token !== generation) return;
      handle = null;
      const current = getSession();
      if (current.status !== "running") return;
      try {
        const event = makeStepEvent(current, new Date().toISOString());
        if (event) {
          emit(event);
          schedule();
        } else {
          active = false;
          emit({ type: "agent.completed", finding: createFinding(current), message: {
            id: `${current.id}-result-${current.run}`, role: "assistant", kind: "result",
            timestamp: new Date().toISOString(),
            content: "I confirmed one issue: repeated checkout submission creates duplicate orders. The reproduction created two order records for one cart. The finding includes synthetic evidence and a step-by-step demo replay.",
          } });
        }
      } catch {
        active = false;
        emit({ type: "agent.failed", message: "The scripted demo was interrupted. Your progress is saved; retry to continue." });
      }
    }, delay);
  }

  function pause() {
    active = false;
    generation += 1;
    if (handle !== null) scheduler.clear(handle);
    handle = null;
  }

  function resume() {
    if (cancelled) return;
    active = true;
    schedule();
  }

  return { start: resume, resume, pause, cancel() { pause(); cancelled = true; } };
}

const defaultScheduler = {
  set: (callback: () => void, delay: number) => setTimeout(callback, delay),
  clear: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
