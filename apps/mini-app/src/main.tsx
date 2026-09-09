import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Category = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
};

type Product = {
  id: number;
  categoryId: number;
  name: string;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  image?: string | null;
  isActive: boolean;
  category?: Category;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        showAlert?: (message: string) => void;
        colorScheme?: "light" | "dark";
        initDataUnsafe?: {
          user?: TelegramUser;
        };
      };
    };
  }
}

const API =
  (import.meta as any).env?.VITE_API_URL ||
  window.localStorage.getItem("tegen_api_url") ||
  "";

const CART_KEY = "tegen_cart";

function money(value: number) {
  return `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;
}

function getTelegramUser(): TelegramUser | null {
  return (
    window.Telegram?.WebApp?.initDataUnsafe?.user ||
    null
  );
}

function loadCart(): Record<string, CartItem> {
  try {
    const saved = localStorage.getItem(CART_KEY);

    if (!saved) {
      return {};
    }

    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveCart(cart: Record<string, CartItem>) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function App() {
  const tg = window.Telegram?.WebApp;

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] =
    useState<Record<string, CartItem>>(loadCart);

  const [activeCategory, setActiveCategory] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    tg?.ready();
    tg?.expand();

    loadCatalog();
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  async function loadCatalog() {
    try {
      setLoading(true);

      const [categoriesResponse, productsResponse] =
        await Promise.all([
          fetch(`${API}/catalog/categories`),
          fetch(`${API}/catalog/products`),
        ]);

      if (!categoriesResponse.ok) {
        throw new Error("Kategoriyalarni yuklab bo‘lmadi");
      }

      if (!productsResponse.ok) {
        throw new Error("Mahsulotlarni yuklab bo‘lmadi");
      }

      const categoriesData =
        await categoriesResponse.json();

      const productsData =
        await productsResponse.json();

      setCategories(categoriesData || []);
      setProducts(productsData || []);

    } catch (error) {
      console.error(error);

      setMessage(
        "Mahsulotlarni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: Product) {
    setCart((current) => {
      const key = String(product.id);
      const existing = current[key];

      return {
        ...current,
        [key]: {
          product,
          quantity: existing
            ? existing.quantity + 1
            : 1,
        },
      };
    });
  }

  function increase(productId: number) {
    setCart((current) => {
      const key = String(productId);
      const item = current[key];

      if (!item) {
        return current;
      }

      return {
        ...current,
        [key]: {
          ...item,
          quantity: item.quantity + 1,
        },
      };
    });
  }

  function decrease(productId: number) {
    setCart((current) => {
      const key = String(productId);
      const item = current[key];

      if (!item) {
        return current;
      }

      if (item.quantity <= 1) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      return {
        ...current,
        [key]: {
          ...item,
          quantity: item.quantity - 1,
        },
      };
    });
  }

  function removeFromCart(productId: number) {
    setCart((current) => {
      const next = { ...current };
      delete next[String(productId)];
      return next;
    });
  }

  const cartItems = useMemo(
    () => Object.values(cart),
    [cart]
  );

  const cartCount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
    [cartItems]
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + item.product.price * item.quantity,
        0
      ),
    [cartItems]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatch =
        activeCategory === null ||
        product.categoryId === activeCategory;

      const searchMatch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.description || "")
          .toLowerCase()
          .includes(query);

      return categoryMatch && searchMatch;
    });
  }, [
    products,
    activeCategory,
    search,
  ]);

  async function submitOrder() {
    const user = getTelegramUser();

    if (!user) {
      tg?.showAlert?.(
        "Telegram foydalanuvchisi aniqlanmadi."
      );
      return;
    }

    if (!cartItems.length) {
      tg?.showAlert?.(
        "Savatchada mahsulot yo‘q."
      );
      return;
    }

    if (!phone.trim()) {
      tg?.showAlert?.(
        "Telefon raqamingizni kiriting."
      );
      return;
    }

    try {
      setOrdering(true);
      setMessage("");

      const response = await fetch(
        `${API}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegramId: String(user.id),
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            username: user.username || "",
            phone: phone.trim(),
            items: cartItems.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          text || "Buyurtma yuborilmadi"
        );
      }

      const order = await response.json();

      setCart({});
      setPhone("");
      setShowCart(false);

      const successMessage =
        `✅ Buyurtma qabul qilindi!\n\n` +
        `№ ${order.orderNumber}\n` +
        `💰 ${money(order.total)}`;

      setMessage(successMessage);

      tg?.showAlert?.(successMessage);

    } catch (error) {
      console.error(error);

      const text =
        error instanceof Error
          ? error.message
          : "Buyurtma yuborishda xatolik";

      setMessage(text);
      tg?.showAlert?.(text);
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div className="app">

      <header className="header">
        <div>
          <h1>🛒 TEGEN</h1>
          <p>Onlayn buyurtma do‘koni</p>
        </div>

        <button
          className="cart-button"
          onClick={() => setShowCart(true)}
        >
          🛒
          {cartCount > 0 && (
            <span>{cartCount}</span>
          )}
        </button>
      </header>


      <main>

        <div className="search-box">
          <span>🔎</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Mahsulot qidirish..."
          />

          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}
        </div>


        <div className="categories">

          <button
            className={
              activeCategory === null
                ? "category active"
                : "category"
            }
            onClick={() =>
              setActiveCategory(null)
            }
          >
            Hammasi
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              className={
                activeCategory === category.id
                  ? "category active"
                  : "category"
              }
              onClick={() =>
                setActiveCategory(category.id)
              }
            >
              {category.name}
            </button>
          ))}

        </div>


        {message && (
          <div className="message">
            {message}
          </div>
        )}


        {loading ? (
          <div className="loading">
            Yuklanmoqda...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty">
            <div>🔍</div>
            <h3>Mahsulot topilmadi</h3>
            <p>
              Boshqa mahsulot yoki kategoriya
              qidirib ko‘ring.
            </p>
          </div>
        ) : (

          <div className="products">

            {filteredProducts.map((product) => {

              const cartItem =
                cart[String(product.id)];

              const discount =
                product.oldPrice &&
                product.oldPrice > product.price
                  ? Math.round(
                      (
                        (product.oldPrice -
                          product.price) /
                        product.oldPrice
                      ) * 100
                    )
                  : 0;

              return (
                <article
                  className="product-card"
                  key={product.id}
                >

                  <div className="product-image-wrap">

                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-image"
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <div className="no-image">
                        🛍️
                      </div>
                    )}

                    {discount > 0 && (
                      <span className="discount">
                        -{discount}%
                      </span>
                    )}

                  </div>


                  <div className="product-content">

                    <div className="product-category">
                      {product.category?.name || ""}
                    </div>

                    <h3>
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="description">
                        {product.description}
                      </p>
                    )}


                    <div className="prices">

                      {product.oldPrice &&
                        product.oldPrice >
                          product.price && (
                          <span className="old-price">
                            {money(product.oldPrice)}
                          </span>
                        )}

                      <span className="price">
                        {money(product.price)}
                      </span>

                    </div>


                    {cartItem ? (
                      <div className="quantity">

                        <button
                          onClick={() =>
                            decrease(product.id)
                          }
                        >
                          −
                        </button>

                        <strong>
                          {cartItem.quantity}
                        </strong>

                        <button
                          onClick={() =>
                            increase(product.id)
                          }
                        >
                          +
                        </button>

                      </div>
                    ) : (
                      <button
                        className="add-button"
                        onClick={() =>
                          addToCart(product)
                        }
                      >
                        🛒 Savatga qo‘shish
                      </button>
                    )}

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </main>


      {cartCount > 0 && !showCart && (
        <button
          className="bottom-cart"
          onClick={() => setShowCart(true)}
        >
          <span>
            🛒 Savatcha ({cartCount})
          </span>

          <strong>
            {money(cartTotal)}
          </strong>
        </button>
      )}


      {showCart && (
        <div className="cart-overlay">

          <div className="cart-panel">

            <div className="cart-header">
              <h2>
                🛒 Savatcha ({cartCount})
              </h2>

              <button
                onClick={() =>
                  setShowCart(false)
                }
              >
                ✕
              </button>
            </div>


            {cartItems.length === 0 ? (

              <div className="empty">
                <div>🛒</div>
                <h3>Savatcha bo‘sh</h3>
                <p>
                  Mahsulotlarni savatchaga
                  qo‘shing.
                </p>
              </div>

            ) : (

              <>

                <div className="cart-items">

                  {cartItems.map((item) => (

                    <div
                      className="cart-item"
                      key={item.product.id}
                    >

                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                        />
                      ) : (
                        <div className="cart-item-image">
                          🛍️
                        </div>
                      )}


                      <div className="cart-item-info">

                        <h3>
                          {item.product.name}
                        </h3>

                        <span>
                          {money(item.product.price)}
                        </span>


                        <div className="quantity">

                          <button
                            onClick={() =>
                              decrease(
                                item.product.id
                              )
                            }
                          >
                            −
                          </button>

                          <strong>
                            {item.quantity}
                          </strong>

                          <button
                            onClick={() =>
                              increase(
                                item.product.id
                              )
                            }
                          >
                            +
                          </button>

                        </div>

                      </div>


                      <div className="cart-item-right">

                        <strong>
                          {money(
                            item.product.price *
                              item.quantity
                          )}
                        </strong>

                        <button
                          className="remove"
                          onClick={() =>
                            removeFromCart(
                              item.product.id
                            )
                          }
                        >
                          🗑
                        </button>

                      </div>

                    </div>

                  ))}

                </div>


                <div className="checkout">

                  <div className="total-row">
                    <span>Jami:</span>

                    <strong>
                      {money(cartTotal)}
                    </strong>
                  </div>


                  <div className="phone-field">

                    <label>
                      📱 Telefon raqam
                    </label>

                    <input
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value
                        )
                      }
                      placeholder="+998 90 123 45 67"
                      type="tel"
                    />

                  </div>


                  <button
                    className="checkout-button"
                    disabled={ordering}
                    onClick={submitOrder}
                  >
                    {ordering
                      ? "⏳ Yuborilmoqda..."
                      : "✅ Buyurtma berish"}
                  </button>

                </div>

              </>

            )}

          </div>

        </div>
      )}

    </div>
  );
}

createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
