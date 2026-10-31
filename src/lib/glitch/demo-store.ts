import type { BrowserCommand, Customer, DemoStoreState } from "./types";

export const PRODUCTS = [
  { id: "tote", name: "Everyday tote", category: "Carry a little less.", price: 32, color: "Natural canvas", art: "/products/tote.svg" },
  { id: "mug", name: "Studio mug", category: "A slower kind of morning.", price: 24, color: "Sage green", art: "/products/mug.svg" },
  { id: "lamp", name: "Arc desk lamp", category: "Find your warm glow.", price: 68, color: "Terracotta", art: "/products/lamp.svg" },
] as const;

export const DEMO_CUSTOMER: Customer = {
  name: "Alex Morgan",
  email: "alex@example.test",
  address: "42 Sample Street",
  city: "Testville",
  zip: "10001",
};

export function emptyStore(): DemoStoreState {
  return {
    page: "products", cart: [],
    customer: { name: "", email: "", address: "", city: "", zip: "" },
    orders: [], submitting: false, pendingSubmissions: 0, attempt: 1, error: null,
  };
}

export function cartTotal(store: DemoStoreState) {
  return store.cart.reduce((total, item) => total + (PRODUCTS.find((p) => p.id === item.productId)?.price ?? 0) * item.quantity, 0);
}

export function cartCount(store: DemoStoreState) {
  return store.cart.reduce((count, item) => count + item.quantity, 0);
}

export function money(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export function settleOrders(store: DemoStoreState): DemoStoreState {
  if (!store.submitting || !store.pendingSubmissions) return store;
  const orders = Array.from({ length: store.pendingSubmissions }, (_, i) => ({
    id: `FF-${1042 + store.orders.length + i}`,
    total: cartTotal(store), email: store.customer.email, attempt: store.attempt,
  }));
  return { ...store, page: "confirmation", orders: [...store.orders, ...orders], submitting: false, pendingSubmissions: 0 };
}

export function updateBrowser(store: DemoStoreState, command: BrowserCommand): DemoStoreState {
  switch (command.type) {
    case "add": {
      if (!PRODUCTS.some((p) => p.id === command.productId)) return store;
      const existing = store.cart.find((item) => item.productId === command.productId);
      return { ...store, error: null, cart: existing
        ? store.cart.map((item) => item.productId === command.productId ? { ...item, quantity: item.quantity + 1 } : item)
        : [...store.cart, { productId: command.productId, quantity: 1 }] };
    }
    case "remove":
      return { ...store, cart: store.cart.filter((item) => item.productId !== command.productId) };
    case "navigate":
      if (command.page === "checkout" && !store.cart.length) return { ...store, page: "cart" };
      if (store.page === "confirmation" && command.page === "products") return { ...store, page: "products", cart: [], attempt: store.attempt + 1, error: null };
      return { ...store, page: command.page, error: null };
    case "customer":
      return { ...store, customer: { ...store.customer, [command.field]: command.value }, error: null };
    case "submit":
      if (!store.cart.length) return { ...store, error: "Add an item to your bag first." };
      if (Object.values(store.customer).some((value) => !value.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.customer.email)) {
        return { ...store, error: "Complete all fields and enter a valid email address." };
      }
      // Intentionally vulnerable: submissions aren't locked while a request is pending.
      return { ...store, submitting: true, pendingSubmissions: store.pendingSubmissions + 1, error: null };
    case "settle":
      return settleOrders(store);
    case "reset":
      return emptyStore();
  }
}

export function storeAddress(store: DemoStoreState) {
  const paths = { products: "shop", cart: "bag", checkout: "checkout", confirmation: "orders/confirmation" };
  return `demo.glitch.local/${paths[store.page]}`;
}
