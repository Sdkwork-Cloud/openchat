import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartResultService, CommerceResultService } from "../services";
import type { Product, ProductCategory } from "../types";

type ProductSortType = "default" | "price-asc" | "price-desc" | "sales" | "rating";

const fallbackProducts: Product[] = [
  {
    id: "fallback-1",
    name: "OpenChat Pro Membership",
    description: "Unlock higher model quotas and team collaboration features.",
    price: 199,
    originalPrice: 299,
    images: [],
    cover: "https://picsum.photos/640/360?random=801",
    category: { id: "membership", name: "Membership", icon: "PRO", sortOrder: 1 },
    tags: ["membership", "productivity"],
    stock: 999,
    sales: 1200,
    rating: 4.8,
    reviewCount: 324,
    specifications: {
      seats: "1",
      access: "Priority",
    },
    detailImages: [],
    isOnSale: true,
    discount: 33,
    merchantId: "m-1",
    merchantName: "OpenChat",
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    name: "Enterprise Knowledge Bundle",
    description: "Ready-to-use knowledge retrieval and QA templates for enterprise rollout.",
    price: 899,
    images: [],
    cover: "https://picsum.photos/640/360?random=802",
    category: { id: "solution", name: "Solution", icon: "BIZ", sortOrder: 2 },
    tags: ["enterprise", "knowledge"],
    stock: 87,
    sales: 320,
    rating: 4.6,
    reviewCount: 98,
    specifications: {
      deployment: "Cloud",
      support: "Standard",
    },
    detailImages: [],
    isOnSale: false,
    merchantId: "m-1",
    merchantName: "OpenChat",
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
  },
];

const sortLabels: Record<ProductSortType, string> = {
  default: "Recommended",
  "price-asc": "Price Low to High",
  "price-desc": "Price High to Low",
  sales: "Best Selling",
  rating: "Top Rated",
};

function formatPrice(value: number): string {
  return `CNY ${value.toFixed(2)}`;
}

export function MallPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [hotProducts, setHotProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);

  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [sortBy, setSortBy] = useState<ProductSortType>("default");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const [categoryRes, hotRes, newRes] = await Promise.all([
          CommerceResultService.getCategories(),
          CommerceResultService.getHotProducts(6),
          CommerceResultService.getNewArrivals(6),
        ]);
        if (cancelled) {
          return;
        }
        if (!categoryRes.success || !hotRes.success || !newRes.success) {
          throw new Error(
            categoryRes.error ||
              hotRes.error ||
              newRes.error ||
              categoryRes.message ||
              hotRes.message ||
              newRes.message ||
              "Failed to load marketplace metadata.",
          );
        }
        setCategories(categoryRes.data || []);
        setHotProducts(hotRes.data || []);
        setNewProducts(newRes.data || []);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load marketplace metadata", error);
        const fallbackCategories = Array.from(
          new Map(fallbackProducts.map((item) => [item.category.id, item.category])).values(),
        );
        setCategories(fallbackCategories);
        setHotProducts([...fallbackProducts].sort((a, b) => b.sales - a.sales).slice(0, 6));
        setNewProducts([...fallbackProducts].slice(0, 6));
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);
      setErrorText(null);

      try {
        const result = await CommerceResultService.getProducts({
          categoryId: categoryId || undefined,
          search: keyword.trim() || undefined,
          sort: sortBy,
          page: 1,
          pageSize: 30,
        });
        if (!result.success || !result.data) {
          throw new Error(result.error || result.message || "Failed to load products.");
        }
        if (!cancelled) {
          setProducts(result.data.items);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load products, fallback used", error);
        setProducts(fallbackProducts);
        setErrorText("Live product feed is unavailable. Fallback catalog is displayed.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [categoryId, keyword, sortBy]);

  useEffect(() => {
    if (products.length === 0) {
      setSelectedProductId(null);
      return;
    }
    if (!selectedProductId || !products.some((item) => item.id === selectedProductId)) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return categories;
    }
    return Array.from(new Map(products.map((item) => [item.category.id, item.category])).values());
  }, [categories, products]);

  const productStats = useMemo(() => {
    if (products.length === 0) {
      return { total: 0, onSale: 0, avgPrice: 0, avgRating: 0 };
    }

    const onSale = products.filter((item) => item.isOnSale).length;
    const avgPrice = products.reduce((sum, item) => sum + item.price, 0) / products.length;
    const avgRating = products.reduce((sum, item) => sum + item.rating, 0) / products.length;
    return {
      total: products.length,
      onSale,
      avgPrice,
      avgRating,
    };
  }, [products]);

  const handleAddToCart = async (productId: string) => {
    setAddingProductId(productId);
    setStatusText("");

    try {
      const result = await CartResultService.addToCart({ productId, quantity: 1 });
      if (!result.success) {
        setStatusText(result.error || result.message || "Failed to add product to cart.");
        return;
      }
      setStatusText("Product added to cart.");
    } catch (error) {
      console.error("Failed to add product to cart", error);
      setStatusText("Failed to add product to cart.");
    } finally {
      setAddingProductId(null);
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Marketplace</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Browse products and services with a desktop shopping workflow.
            </p>
          </div>
          <button
            onClick={() => navigate("/commerce/cart")}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
          >
            Open Cart
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[560px] gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-text-primary">Categories</h2>
              <p className="mt-1 text-xs text-text-secondary">Switch product channels quickly.</p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                <button
                  onClick={() => setCategoryId("")}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${
                    categoryId === ""
                      ? "border-primary bg-primary-soft/25"
                      : "border-border bg-bg-primary hover:bg-bg-hover"
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">All Products</p>
                  <p className="mt-1 text-xs text-text-muted">{products.length} items</p>
                </button>
                {categoryOptions.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      categoryId === category.id
                        ? "border-primary bg-primary-soft/25"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="text-sm font-medium text-text-primary">
                      {category.icon || "CAT"} {category.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary">Hot Picks</h3>
              <div className="mt-2 space-y-2">
                {hotProducts.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedProductId(item.id)}
                    className="w-full rounded-md border border-border bg-bg-primary px-2.5 py-2 text-left hover:bg-bg-hover"
                  >
                    <p className="line-clamp-1 text-xs font-medium text-text-primary">{item.name}</p>
                    <p className="mt-1 text-[11px] text-text-muted">Sales {item.sales}</p>
                  </button>
                ))}
                {hotProducts.length === 0 ? <p className="text-xs text-text-muted">No hot products.</p> : null}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px_170px_auto]">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search products by name or tags"
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as ProductSortType)}
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                >
                  {(Object.keys(sortLabels) as ProductSortType[]).map((key) => (
                    <option key={key} value={key}>
                      {sortLabels[key]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setKeyword("");
                    setCategoryId("");
                    setSortBy("default");
                  }}
                  className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Results</p>
                  <p className="text-sm font-semibold text-text-primary">{productStats.total}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">On Sale</p>
                  <p className="text-sm font-semibold text-text-primary">{productStats.onSale}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Average Price</p>
                  <p className="text-sm font-semibold text-text-primary">{formatPrice(productStats.avgPrice || 0)}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Average Rating</p>
                  <p className="text-sm font-semibold text-text-primary">{productStats.avgRating.toFixed(1)}</p>
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
              <div className="grid h-full min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-h-0 overflow-auto rounded-lg border border-border bg-bg-primary">
                  {isLoading ? (
                    <div className="p-4 text-sm text-text-secondary">Loading products...</div>
                  ) : products.length === 0 ? (
                    <div className="p-4 text-sm text-text-secondary">
                      No products found with the current filters.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
                      {products.map((product) => {
                        const selected = product.id === selectedProductId;
                        return (
                          <article
                            key={product.id}
                            onClick={() => setSelectedProductId(product.id)}
                            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                              selected ? "border-primary bg-primary-soft/20" : "border-border hover:bg-bg-hover"
                            }`}
                          >
                            <img src={product.cover} alt={product.name} className="h-28 w-full rounded-md object-cover" />
                            <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-text-primary">{product.name}</h3>
                            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{product.description}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-text-primary">{formatPrice(product.price)}</p>
                                {product.originalPrice ? (
                                  <p className="text-[11px] text-text-muted line-through">{formatPrice(product.originalPrice)}</p>
                                ) : null}
                              </div>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleAddToCart(product.id);
                                }}
                                disabled={addingProductId === product.id}
                                className="rounded-md bg-primary px-2.5 py-1.5 text-xs text-white disabled:opacity-60"
                              >
                                {addingProductId === product.id ? "Adding..." : "Add"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-bg-primary">
                  {selectedProduct ? (
                    <>
                      <img src={selectedProduct.cover} alt={selectedProduct.name} className="h-44 w-full rounded-t-lg object-cover" />
                      <div className="min-h-0 flex-1 overflow-auto p-4">
                        <h3 className="text-base font-semibold text-text-primary">{selectedProduct.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{selectedProduct.description}</p>
                        <div className="mt-3 space-y-1 text-xs text-text-muted">
                          <p>Merchant: {selectedProduct.merchantName}</p>
                          <p>Price: {formatPrice(selectedProduct.price)}</p>
                          <p>Stock: {selectedProduct.stock}</p>
                          <p>Sales: {selectedProduct.sales}</p>
                          <p>
                            Rating: {selectedProduct.rating.toFixed(1)} ({selectedProduct.reviewCount} reviews)
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedProduct.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        {Object.keys(selectedProduct.specifications).length > 0 ? (
                          <div className="mt-4 rounded-md border border-border bg-bg-secondary p-3">
                            <p className="text-xs font-semibold text-text-primary">Specifications</p>
                            <div className="mt-2 space-y-1 text-xs text-text-secondary">
                              {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                                <p key={key}>
                                  {key}: {value}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="border-t border-border p-3">
                        <button
                          onClick={() => void handleAddToCart(selectedProduct.id)}
                          disabled={addingProductId === selectedProduct.id}
                          className="w-full rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-60"
                        >
                          {addingProductId === selectedProduct.id ? "Adding to Cart..." : "Add to Cart"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-sm text-text-muted">
                      Select a product to inspect details.
                    </div>
                  )}
                </aside>
              </div>
            </div>

            {newProducts.length > 0 ? (
              <div className="border-t border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">New Arrivals</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {newProducts.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedProductId(item.id)}
                      className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}

export default MallPage;
