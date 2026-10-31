"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Minus,
  Package,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { cartCount, cartTotal, money, PRODUCTS } from "@/lib/glitch/demo-store";
import type {
  BrowserCommand,
  Customer,
  DemoStoreState,
} from "@/lib/glitch/types";
import "./demo-store.css";

export function DemoStore({
  store,
  interactive,
  onCommand = () => {},
}: {
  store: DemoStoreState;
  interactive: boolean;
  onCommand?(command: BrowserCommand): void;
}) {
  const total = cartTotal(store);
  const currentOrders = store.orders.filter(
    (order) => order.attempt === store.attempt,
  );
  function navigate(page: DemoStoreState["page"]) {
    onCommand({ type: "navigate", page });
  }

  function orderSummary() {
    return (
      <div className="store-order-summary">
        <h3>
          Your order{" "}
          <span>
            {cartCount(store)} {cartCount(store) === 1 ? "item" : "items"}
          </span>
        </h3>
        {store.cart.map((item) => {
          const product = PRODUCTS.find((p) => p.id === item.productId);
          if (!product) return null;
          return (
            <div className="store-summary-item" key={item.productId}>
              <Image src={product.art} alt="" width={72} height={72} />
              <div>
                <strong>{product.name}</strong>
                <span>
                  {product.color} · Qty {item.quantity}
                </span>
              </div>
              <span>{money(product.price * item.quantity)}</span>
            </div>
          );
        })}
        <div className="store-price-line">
          <span>Subtotal</span>
          <span>{money(total)}</span>
        </div>
        <div className="store-price-line">
          <span>Shipping</span>
          <span className="store-free">On us</span>
        </div>
        <div className="store-price-total">
          <span>Total</span>
          <strong>
            {money(total)} <small>USD</small>
          </strong>
        </div>
        <p className="store-secure">
          <ShieldCheck size={13} /> Sample checkout. No real payment.
        </p>
      </div>
    );
  }

  return (
    <fieldset
      disabled={!interactive}
      className="store-root"
      aria-label="Demo Store application"
    >
      <div className="store-announcement">
        <span>Thoughtfully made. Meant to stay.</span>
        <span>
          Free shipping on every order <ArrowRight size={11} />
        </span>
      </div>
      <header className="store-header">
        <button className="store-wordmark" onClick={() => navigate("products")}>
          <span>
            <Leaf size={17} />
          </span>
          form & field<span className="store-wordmark-dot">®</span>
        </button>
        <button
          className="store-bag"
          onClick={() => navigate("cart")}
          data-agent-target="cart"
          aria-label={`Shopping bag, ${cartCount(store)} items`}
        >
          <ShoppingBag size={17} />
          <span>Bag</span>
          <span className="store-bag-count">{cartCount(store)}</span>
        </button>
      </header>

      {store.page === "products" && (
        <div className="store-products-page">
          <div className="store-hero">
            <div>
              <span className="store-eyebrow">
                <span /> THE EVERYDAY EDIT
              </span>
              <h2>
                Good things.
                <br />
                <span>For the everyday.</span>
              </h2>
              <p>
                Simple objects. A little more considered.
                <br />
                Made for the way you live.
              </p>
            </div>
            <div className="store-season">
              Less, but
              <br />
              <em>better.</em>
              <span>COLLECTION No. 01</span>
            </div>
          </div>
          <div className="store-collection-heading">
            <span>A few of our favorites</span>
            <span>01 — 03</span>
          </div>
          <div className="store-product-grid">
            {PRODUCTS.map((product, index) => (
              <article className="store-product" key={product.id}>
                <div className="store-product-image">
                  <Image
                    src={product.art}
                    width={640}
                    height={520}
                    alt={`${product.color} ${product.name}`}
                    priority={index === 0}
                  />
                  <span>
                    {index === 0
                      ? "THE BESTSELLER"
                      : index === 1
                        ? "SLOW MORNINGS"
                        : "A WARMER SPACE"}
                  </span>
                </div>
                <div className="store-product-title">
                  <h3>{product.name}</h3>
                  <span>{money(product.price).replace(".00", "")}</span>
                </div>
                <p>{product.category}</p>
                <button
                  className="store-add"
                  onClick={() =>
                    onCommand({ type: "add", productId: product.id })
                  }
                  data-agent-target={index === 0 ? "product" : undefined}
                >
                  {store.cart.some((item) => item.productId === product.id) ? (
                    <Check size={13} />
                  ) : (
                    <ShoppingBag size={13} />
                  )}
                  {store.cart.some((item) => item.productId === product.id)
                    ? "Add another"
                    : "Add to bag"}
                  <span>+</span>
                </button>
              </article>
            ))}
          </div>
          <div className="store-values">
            <span>
              <Leaf size={14} /> Thoughtfully sourced
            </span>
            <span>
              <Truck size={15} /> Shipping, on us
            </span>
            <span>
              <Package size={14} /> Made for everyday
            </span>
          </div>
        </div>
      )}

      {store.page === "cart" && (
        <div className="store-content-page">
          <button className="store-back" onClick={() => navigate("products")}>
            <ArrowLeft size={13} /> Keep exploring
          </button>
          <span className="store-eyebrow">THE GOOD STUFF</span>
          <h2>
            Your shopping bag
            <span className="store-item-count">({cartCount(store)})</span>
          </h2>
          {store.cart.length ? (
            <div className="store-cart-layout">
              <div className="store-cart-items">
                {store.cart.map((item) => {
                  const p = PRODUCTS.find(
                    (product) => product.id === item.productId,
                  )!;
                  return (
                    <div className="store-cart-item" key={item.productId}>
                      <Image
                        src={p.art}
                        alt={p.name}
                        width={120}
                        height={120}
                      />
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.color}</span>
                        <span>Quantity: {item.quantity}</span>
                        <button
                          onClick={() =>
                            onCommand({ type: "remove", productId: p.id })
                          }
                          aria-label={`Remove ${p.name}`}
                        >
                          <Minus size={10} /> Remove
                        </button>
                      </div>
                      <strong>{money(p.price * item.quantity)}</strong>
                    </div>
                  );
                })}
                <p className="store-shipping-note">
                  <Truck size={17} /> Good news: this one ships for free.
                </p>
              </div>
              <div>
                {orderSummary()}
                <button
                  className="store-primary"
                  onClick={() => navigate("checkout")}
                  data-agent-target="checkout"
                >
                  Continue to checkout
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="store-empty-bag">
              <ShoppingBag size={32} />
              <h3>A little room for good things.</h3>
              <p>Your bag is empty. Find your everyday favorite.</p>
              <button
                className="store-primary"
                onClick={() => navigate("products")}
              >
                Explore the collection
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {store.page === "checkout" && (
        <div className="store-content-page store-checkout-page">
          <button className="store-back" onClick={() => navigate("cart")}>
            <ArrowLeft size={13} /> Back to bag
          </button>
          <div className="store-checkout-title">
            <div>
              <span className="store-eyebrow">ALMOST YOURS</span>
              <h2>A few final details.</h2>
            </div>
            <LockKeyhole size={18} />
          </div>
          <div className="store-checkout-layout">
            <form
              className="store-checkout-form"
              onSubmit={(event) => {
                event.preventDefault();
                onCommand({ type: "submit" });
              }}
            >
              <div data-agent-target="customer">
                <h3>Contact & delivery</h3>
                <p className="store-synthetic-note">
                  Use fictional details. This is a demo store.
                </p>
                {(
                  [
                    ["name", "Full name", "Alex Morgan"],
                    ["email", "Email address", "alex@example.test"],
                    ["address", "Street address", "42 Sample Street"],
                  ] as const
                ).map(([field, label, placeholder]) => (
                  <label className="store-field" key={field}>
                    {label}
                    <input
                      className="input input-sm"
                      name={field}
                      type={field === "email" ? "email" : "text"}
                      value={store.customer[field]}
                      placeholder={placeholder}
                      required
                      autoComplete="off"
                      onChange={(event) =>
                        onCommand({
                          type: "customer",
                          field,
                          value: event.target.value,
                        })
                      }
                    />
                  </label>
                ))}
                <div className="store-field-row">
                  {(
                    [
                      ["city", "City", "Testville"],
                      ["zip", "Postal code", "10001"],
                    ] as [keyof Customer, string, string][]
                  ).map(([field, label, placeholder]) => (
                    <label className="store-field" key={field}>
                      {label}
                      <input
                        className="input input-sm"
                        name={field}
                        value={store.customer[field]}
                        placeholder={placeholder}
                        autoComplete="off"
                        required
                        onChange={(event) =>
                          onCommand({
                            type: "customer",
                            field,
                            value: event.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              {store.error && (
                <p className="store-form-error" role="alert">
                  {store.error}
                </p>
              )}
              <button
                type="submit"
                className={`store-primary store-submit ${store.submitting ? "store-processing" : ""}`}
                data-agent-target="submit"
              >
                {store.submitting ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    Place order · {money(total)}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
              <p className="store-no-payment">
                <LockKeyhole size={11} /> Demo checkout. No payment will be
                taken.
              </p>
              {store.submitting && (
                <div className="store-pending-note">
                  <span className="loading-dot" />
                  {store.pendingSubmissions}{" "}
                  {store.pendingSubmissions === 1 ? "request" : "requests"}{" "}
                  pending<span>Button is still enabled</span>
                </div>
              )}
            </form>
            {orderSummary()}
          </div>
        </div>
      )}

      {store.page === "confirmation" && (
        <div className="store-confirmation" data-agent-target="confirmation">
          <span className="store-confirmation-icon">
            <CheckCircle2 size={26} />
          </span>
          <span className="store-eyebrow">WELL, HELLO THERE.</span>
          <h2>Good things are on their way.</h2>
          <p>
            Thanks, {store.customer.name.split(" ")[0] || "friend"}. Your order
            details are below.
          </p>
          <div className="store-order-records">
            <div>
              <span>ORDER CONFIRMATION</span>
              <span>{currentOrders.length} records created</span>
            </div>
            {currentOrders.map((order) => (
              <div className="store-order-record" key={order.id}>
                <span>
                  <Package size={17} />
                  <span>
                    <strong>{order.id}</strong>
                    <small>{order.email}</small>
                  </span>
                </span>
                <strong>{money(order.total)}</strong>
              </div>
            ))}
          </div>
          {currentOrders.length > 1 && (
            <div className="store-duplicate-note">
              <span>!</span>
              <div>
                <strong>That’s more than one order.</strong>
                <p>
                  {currentOrders.length} orders were created for the same
                  checkout attempt. This is the intentional bug in the demo.
                </p>
              </div>
            </div>
          )}
          <button
            className="store-text-button"
            onClick={() => navigate("products")}
          >
            Back to the collection
            <ChevronRight size={13} />
          </button>
        </div>
      )}
      <footer className="store-footer">
        <span>Fewer things. Better things.</span>
        <span>FORM & FIELD · DEMO STORE</span>
      </footer>
    </fieldset>
  );
}
