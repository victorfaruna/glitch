export type SessionStatus = "idle" | "running" | "paused" | "manual" | "completed" | "error";
export type ViewportSize = "desktop" | "mobile";
export type WorkspaceTab = "browser" | "findings" | "replay";
export type StorePage = "products" | "cart" | "checkout" | "confirmation";
export type ActionTarget = "product" | "cart" | "checkout" | "customer" | "submit" | "confirmation";

export interface Customer {
  name: string;
  email: string;
  address: string;
  city: string;
  zip: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  total: number;
  email: string;
  attempt: number;
}

export interface DemoStoreState {
  page: StorePage;
  cart: CartItem[];
  customer: Customer;
  orders: Order[];
  submitting: boolean;
  pendingSubmissions: number;
  attempt: number;
  error: string | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  kind?: "intro" | "result";
}

export interface AgentAction {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
  target?: ActionTarget;
  phase: "observe" | "act" | "verify";
}

export interface ReplayStep {
  id: string;
  action: AgentAction;
  snapshot: DemoStoreState;
  viewport: ViewportSize;
}

export interface Finding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  status: "confirmed";
  explanation: string;
  expected: string;
  actual: string;
  steps: string[];
  evidence: Order[];
  relatedActionIds: string[];
  replayStepId: string;
}

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  sample: boolean;
  status: SessionStatus;
  target: { kind: "demo" | "custom"; url: string };
  viewport: ViewportSize;
  messages: Message[];
  actions: AgentAction[];
  findings: Finding[];
  replay: ReplayStep[];
  browser: DemoStoreState;
  cursor: number;
  run: number;
  error: string | null;
}

export interface WorkspaceState {
  version: 1;
  activeId: string;
  sessions: Session[];
}

export type AgentEvent =
  | { type: "agent.step"; cursor: number; action: AgentAction; browser: DemoStoreState; replay: ReplayStep }
  | { type: "agent.completed"; finding: Finding; message: Message }
  | { type: "agent.failed"; message: string };

export type BrowserCommand =
  | { type: "add"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "navigate"; page: StorePage }
  | { type: "customer"; field: keyof Customer; value: string }
  | { type: "submit" }
  | { type: "settle" }
  | { type: "reset" };

export type WorkspaceEvent =
  | { type: "session.new"; id: string; timestamp: string }
  | { type: "session.select"; id: string }
  | { type: "session.send"; content: string; timestamp: string; id: string; reply?: string; isTest?: boolean }
  | { type: "session.reply"; id: string; content: string; timestamp: string; isTest?: boolean; target?: Session["target"] }
  | { type: "session.control"; status: "running" | "paused" | "manual" }
  | { type: "session.target"; target: Session["target"] }
  | { type: "session.viewport"; viewport: ViewportSize }
  | { type: "session.interrupt" }
  | { type: "browser.command"; command: BrowserCommand; sessionId?: string }
  | { type: "session.agent"; sessionId: string; run: number; event: AgentEvent };

export interface AgentAdapter {
  start(): void;
  pause(): void;
  resume(): void;
  cancel(): void;
}
