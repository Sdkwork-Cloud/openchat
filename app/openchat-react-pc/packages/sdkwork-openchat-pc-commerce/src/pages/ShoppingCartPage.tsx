import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartResultService, type CartSummary } from "../services";

function createFallbackCart(): CartSummary {
  return {
    items: [],
    totalCount: 0,
    selectedCount: 0,
    totalAmount: 0,
    selectedAmount: 0,
  };
}

function formatPrice(value: number): string {
  return `CNY ${value.toFixed(2)}`;
}

export function ShoppingCartPage() {
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartSummary>(createFallbackCart());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadCart = async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const result = await CartResultService.getCart();
      if (!result.success || !result.data) {
        setCart(createFallbackCart());
        setErrorText(result.error || result.message || "Failed to load cart data.");
        return;
      }
      setCart(result.data);
    } catch (error) {
      console.error("Failed to load cart", error);
      setCart(createFallbackCart());
      setErrorText("Failed to load cart data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCart();
  }, []);

  useEffect(() => {
    if (cart.items.length === 0) {
      setSelectedItemId(null);
      return;
    }
    if (!selectedItemId || !cart.items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(cart.items[0].id);
    }
  }, [cart.items, selectedItemId]);

  const selectedItem = useMemo(
    () => cart.items.find((item) => item.id === selectedItemId) || null,
    [cart.items, selectedItemId],
  );

  const allSelected = useMemo(
    () => cart.items.length > 0 && cart.items.every((item) => item.selected),
    [cart.items],
  );

  const selectedSubtotal = useMemo(
    () => cart.items.filter((item) => item.selected).reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart.items],
  );

  const handleChangeQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      return;
    }

    setProcessingItemId(itemId);
    setStatusText("");

    try {
      const result = await CartResultService.updateCartItem({ itemId, quantity });
      if (!result.success) {
        setStatusText(result.error || result.message || "Failed to update quantity.");
        return;
      }
      await loadCart();
    } catch (error) {
      console.error("Failed to update quantity", error);
      setStatusText("Failed to update quantity.");
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleToggleSelect = async (itemId: string, selected: boolean) => {
    setProcessingItemId(itemId);
    setStatusText("");

    try {
      const result = await CartResultService.selectItem(itemId, selected);
      if (!result.success) {
        setStatusText(result.error || result.message || "Failed to update selected state.");
        return;
      }
      await loadCart();
    } catch (error) {
      console.error("Failed to update selected state", error);
      setStatusText("Failed to update selected state.");
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleSelectAll = async () => {
    setStatusText("");
    try {
      const result = await CartResultService.selectAll(!allSelected);
      if (!result.success) {
        setStatusText(result.error || result.message || "Failed to toggle select all.");
        return;
      }
      await loadCart();
    } catch (error) {
      console.error("Failed to toggle select all", error);
      setStatusText("Failed to toggle select all.");
    }
  };

  const handleRemove = async (itemId: string) => {
    setProcessingItemId(itemId);
    setStatusText("");

    try {
      const result = await CartResultService.removeFromCart(itemId);
      if (!result.success) {
        setStatusText(result.error || result.message || "Failed to remove item.");
        return;
      }
      setStatusText("Item removed.");
      await loadCart();
    } catch (error) {
      console.error("Failed to remove item", error);
      setStatusText("Failed to remove item.");
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleClearSelected = async () => {
    setStatusText("");
    try {
      const result = await CartResultService.clearSelected();
      if (!result.success) {
        setStatusText(result.error || result.message || "Failed to clear selected items.");
        return;
      }
      setStatusText("Selected items removed.");
      await loadCart();
    } catch (error) {
      console.error("Failed to clear selected items", error);
      setStatusText("Failed to clear selected items.");
    }
  };

  const handleClearCart = async () => {
    setStatusText("");
    try {
      const result = await CartResultService.clearCart();
      if (!result.success) {
        setStatusText(result.error || result.message || "Failed to clear cart.");
        return;
      }
      setStatusText("Cart cleared.");
      await loadCart();
    } catch (error) {
      console.error("Failed to clear cart", error);
      setStatusText("Failed to clear cart.");
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Shopping Cart</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage selected products and quantities in a checkout-ready workspace.
            </p>
          </div>
          <button
            onClick={() => navigate("/commerce/mall")}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
          >
            Back to Marketplace
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[560px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-text-primary">Cart Items</h2>
              <p className="mt-1 text-xs text-text-secondary">Select, update quantity, and remove products.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void handleSelectAll()}
                  className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                >
                  {allSelected ? "Unselect All" : "Select All"}
                </button>
                <button
                  onClick={() => void handleClearSelected()}
                  className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                >
                  Remove Selected
                </button>
                <button
                  onClick={() => void handleClearCart()}
                  className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-border p-3">
              <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                <p className="text-[11px] text-text-muted">Total Items</p>
                <p className="text-sm font-semibold text-text-primary">{cart.totalCount}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                <p className="text-[11px] text-text-muted">Selected</p>
                <p className="text-sm font-semibold text-text-primary">{cart.selectedCount}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-text-secondary">Loading cart...</div>
              ) : cart.items.length === 0 ? (
                <div className="p-4 text-sm text-text-secondary">Cart is empty. Add products from marketplace.</div>
              ) : (
                <div className="divide-y divide-border">
                  {cart.items.map((item) => {
                    const selected = item.id === selectedItemId;
                    const busy = processingItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`cursor-pointer px-4 py-3 transition-colors ${
                          selected ? "bg-primary-soft/25" : "hover:bg-bg-hover"
                        } ${busy ? "opacity-70" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => void handleToggleSelect(item.id, event.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-primary"
                          />
                          <img
                            src={item.product.cover}
                            alt={item.product.name}
                            className="h-14 w-20 rounded-md object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-semibold text-text-primary">{item.product.name}</p>
                            <p className="mt-1 text-xs text-text-muted">{formatPrice(item.product.price)}</p>
                            <div className="mt-2 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                              <button
                                onClick={() => void handleChangeQuantity(item.id, item.quantity - 1)}
                                className="h-6 w-6 rounded-md border border-border bg-bg-tertiary text-xs text-text-secondary"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs text-text-primary">{item.quantity}</span>
                              <button
                                onClick={() => void handleChangeQuantity(item.id, item.quantity + 1)}
                                className="h-6 w-6 rounded-md border border-border bg-bg-tertiary text-xs text-text-secondary"
                              >
                                +
                              </button>
                              <button
                                onClick={() => void handleRemove(item.id)}
                                className="ml-2 rounded-md border border-border bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Cart Total</p>
                  <p className="text-base font-semibold text-text-primary">{formatPrice(cart.totalAmount)}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Selected Total</p>
                  <p className="text-base font-semibold text-text-primary">{formatPrice(cart.selectedAmount)}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Calculated Subtotal</p>
                  <p className="text-base font-semibold text-text-primary">{formatPrice(selectedSubtotal)}</p>
                </div>
              </div>

              {statusText ? <p className="mt-3 text-sm text-text-secondary">{statusText}</p> : null}
              {errorText ? (
                <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                  {errorText}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 p-4">
              <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-auto rounded-lg border border-border bg-bg-primary p-4">
                  {selectedItem ? (
                    <div className="space-y-4">
                      <img
                        src={selectedItem.product.cover}
                        alt={selectedItem.product.name}
                        className="h-56 w-full rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="text-base font-semibold text-text-primary">{selectedItem.product.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{selectedItem.product.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-md border border-border bg-bg-secondary px-3 py-2">
                          <p className="text-text-muted">Unit Price</p>
                          <p className="mt-1 font-semibold text-text-primary">
                            {formatPrice(selectedItem.product.price)}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-bg-secondary px-3 py-2">
                          <p className="text-text-muted">Quantity</p>
                          <p className="mt-1 font-semibold text-text-primary">{selectedItem.quantity}</p>
                        </div>
                        <div className="rounded-md border border-border bg-bg-secondary px-3 py-2">
                          <p className="text-text-muted">Line Amount</p>
                          <p className="mt-1 font-semibold text-text-primary">
                            {formatPrice(selectedItem.product.price * selectedItem.quantity)}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-bg-secondary px-3 py-2">
                          <p className="text-text-muted">Stock</p>
                          <p className="mt-1 font-semibold text-text-primary">{selectedItem.product.stock}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-text-muted">
                      Select an item to inspect details.
                    </div>
                  )}
                </div>

                <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-bg-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">Checkout Summary</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Selected Items</span>
                      <span>{cart.selectedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Selected Amount</span>
                      <span>{formatPrice(cart.selectedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Estimated Discount</span>
                      <span>- {formatPrice(Math.max(0, cart.selectedAmount * 0.05))}</span>
                    </div>
                    <div className="border-t border-border pt-2 text-base font-semibold text-text-primary">
                      <div className="flex items-center justify-between">
                        <span>Estimated Payable</span>
                        <span>{formatPrice(Math.max(0, cart.selectedAmount * 0.95))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => void handleClearSelected()}
                      disabled={cart.selectedCount === 0}
                      className="w-full rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-60"
                    >
                      Remove Selected Items
                    </button>
                    <button
                      onClick={() => navigate("/commerce/mall")}
                      className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                    >
                      Add More Products
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-text-muted">
                    Checkout APIs are managed by the backend order module. This cart page keeps item state and totals consistent.
                  </p>
                </aside>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export default ShoppingCartPage;
