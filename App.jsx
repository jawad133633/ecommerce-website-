import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import AuthPage from "./AuthPage";

const API = `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")}`;
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const allCategoriesLabel = "All products";
const productsPerPage = 12;

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "bag") {
    return (
      <svg {...common}>
        <path d="M5 8h14l1 12H4L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.2 4.2" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path d="m18 6-12 12M6 6l12 12" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M4 12h15M13 5l7 7-7 7" />
      </svg>
    );
  }

  if (name === "minus") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...common}>
        <path d="M20.8 8.7c0 5.1-8.8 10-8.8 10s-8.8-4.9-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 12.5 9.3 17 19 7" />
    </svg>
  );
}

function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [products, setProducts] = useState([]);
  const [visibleProductCount, setVisibleProductCount] = useState(productsPerPage);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("atelier-cart") || "[]");
    } catch {
      return [];
    }
  });
  const [activeCategory, setActiveCategory] = useState(allCategoriesLabel);
  const [sortOrder, setSortOrder] = useState("featured");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchSuggestion, setActiveSearchSuggestion] = useState(-1);
  const searchContainerRef = useRef(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentConfig, setPaymentConfig] = useState({
    easypaisa: { enabled: false },
  });
  const [paymentConfigError, setPaymentConfigError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentReference, setPaymentReference] = useState("");
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [notice, setNotice] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [account, setAccount] = useState(() => {
    try { return JSON.parse(localStorage.getItem("marketplace-session") || "null"); } catch { return null; }
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [storeSetupView, setStoreSetupView] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("good-market-wishlist") || "[]"); } catch { return []; }
  });
  const [authMode, setAuthMode] = useState("login");
  const [accountError, setAccountError] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerView, setSellerView] = useState(false);
  const [shipping, setShipping] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("good-market-address") || "null");
      const signedInUser = JSON.parse(localStorage.getItem("marketplace-session") || "null")?.user;
      return saved || { name: signedInUser?.name || "", email: signedInUser?.email || "", address: "", city: "", postalCode: "", country: "Pakistan" };
    }
    catch { return { name: "", email: "", address: "", city: "", postalCode: "", country: "Pakistan" }; }
  });
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    function closeSearchOnOutsideClick(event) {
      if (!searchContainerRef.current?.contains(event.target)) setSearchOpen(false);
    }
    document.addEventListener("pointerdown", closeSearchOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeSearchOnOutsideClick);
  }, []);

  function navigate(path) {
    window.history.pushState({}, "", path);
    setRoute(path);
    setAccountError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseSearchSuggestion(suggestion) {
    setSearchOpen(false);
    setActiveSearchSuggestion(-1);
    if (suggestion.type === "product") {
      setSelectedProduct(suggestion.product);
      setSearch(suggestion.label);
    } else {
      setActiveCategory(suggestion.label);
      setSearch("");
      document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const suggestion = searchSuggestions[activeSearchSuggestion];
    if (suggestion) return chooseSearchSuggestion(suggestion);
    setActiveCategory(allCategoriesLabel);
    setSearchOpen(false);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (account?.token) localStorage.setItem("marketplace-session", JSON.stringify(account));
    else localStorage.removeItem("marketplace-session");
  }, [account]);

  useEffect(() => { localStorage.setItem("good-market-wishlist", JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem("good-market-address", JSON.stringify(shipping)); }, [shipping]);

  useEffect(() => {
    if (!account?.token) return;
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${account.token}` } })
      .then(({ data }) => setAccount((current) => current ? { ...current, user: data.user } : current))
      .catch(() => setAccount(null));
  }, [account?.token]);

  async function submitAccount(event) {
    event.preventDefault();
    setAccountBusy(true);
    setAccountError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const mode = route === "/signup" ? "signup" : authMode;
      const { data } = await axios.post(`${API}/auth/${mode === "signup" ? "signup" : "login"}`, body);
      setAccount(data);
      setSellerView(false);
      setStoreSetupView(false);
      setShipping((current) => ({ ...current, name: current.name || data.user.name, email: current.email || data.user.email }));
      setAccountOpen(false);
      navigate("/");
      if (data.user.store) {
        const response = await axios.get(`${API}/products/seller/mine`, { headers: { Authorization: `Bearer ${data.token}` } });
        setSellerProducts(response.data);
      }
    } catch (requestError) {
      setAccountError(requestError.response?.data?.message || "We couldn’t connect to your account. Please try again.");
    } finally { setAccountBusy(false); }
  }

  async function loadOrders() {
    if (!account?.token) { navigate("/login"); return; }
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const { data } = await axios.get(`${API}/orders/mine`, { headers: { Authorization: `Bearer ${account.token}` } });
      setOrders(data);
    } catch (requestError) {
      setOrdersError(requestError.response?.data?.message || "Could not load your orders.");
    } finally { setOrdersLoading(false); }
  }

  function toggleWishlist(product) {
    setWishlist((current) => current.some((item) => item._id === product._id)
      ? current.filter((item) => item._id !== product._id)
      : [{ _id: product._id, name: product.name, price: product.price, image: product.image, category: product.category, storeName: product.storeName }, ...current]);
  }

  function addWishlistItemToCart(item) {
    const product = products.find((entry) => entry._id === item._id);
    if (!product) { setNotice("This item is no longer available."); return; }
    setWishlistOpen(false);
    addToCart(product);
  }

  async function createSellerResource(event, type) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setAccountBusy(true);
    setAccountError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (type === "product") {
      body.price = Number(body.price);
      body.stock = Number(body.stock);
    }
    try {
      const { data } = await axios.post(`${API}/${type === "store" ? "auth/store" : "products/seller"}`, body, {
        headers: { Authorization: `Bearer ${account.token}` },
      });
      if (type === "store") {
        setAccount((current) => ({ ...current, user: data.user }));
        setStoreSetupView(false);
      }
      else {
        setSellerProducts((current) => [data, ...current]);
        setProducts((current) => [data, ...current]);
        formElement.reset();
      }
    } catch (requestError) {
      setAccountError(requestError.response?.data?.message || "We couldn’t save that. Please try again.");
    } finally { setAccountBusy(false); }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const { data } = await axios.get(`${API}/products`);
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : data.data || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError.response?.data?.message ||
              "We couldn’t load the collection. Please check that the store server is running and try again.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    axios
      .get(`${API}/payments/config`)
      .then(({ data }) => {
        if (isMounted) setPaymentConfig(data);
      })
      .catch((requestError) => {
        if (isMounted) {
          setPaymentConfigError(
            requestError.response?.data?.message ||
              "Online payment options could not be loaded. Cash on delivery is still available.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("atelier-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!isCartOpen && !isCheckoutOpen && !accountOpen && !wishlistOpen && !selectedProduct) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsCartOpen(false);
        setIsCheckoutOpen(false);
        setAccountOpen(false);
        setWishlistOpen(false);
        setSelectedProduct(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accountOpen, isCartOpen, isCheckoutOpen, wishlistOpen, selectedProduct]);

  const categories = useMemo(() => [allCategoriesLabel, ...new Set(products.map((product) => product.category).filter(Boolean).sort())], [products]);
  const dealProducts = useMemo(() => products.filter((product) => product.compareAtPrice > product.price).slice(0, 4), [products]);
  const searchQuery = search.trim().toLowerCase();
  const matchingCategories = categories.slice(1).filter((category) => !searchQuery || category.toLowerCase().includes(searchQuery)).slice(0, searchQuery ? 3 : 5).map((category) => ({ type: "category", label: category }));
  const matchingProducts = searchQuery ? products.filter((product) => `${product.name} ${product.category} ${product.storeName || ""} ${product.description || ""}`.toLowerCase().includes(searchQuery)).slice(0, 5).map((product) => ({ type: "product", label: product.name, product })) : [];
  const popularProducts = searchQuery ? [] : products.filter((product) => product.featured).slice(0, 3).map((product) => ({ type: "product", label: product.name, product }));
  const searchSuggestions = [...matchingCategories, ...(searchQuery ? matchingProducts : popularProducts)];

  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const results = products.filter((product) => {
      const matchesCategory =
        activeCategory === allCategoriesLabel || product.category === activeCategory;
      const matchesSearch =
        !query ||
        `${product.name} ${product.description} ${product.category} ${product.storeName || ""}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
    return [...results].sort((a, b) => {
      if (sortOrder === "price-low") return a.price - b.price;
      if (sortOrder === "price-high") return b.price - a.price;
      if (sortOrder === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }, [activeCategory, deferredSearch, products, sortOrder]);
  const visibleProducts = filteredProducts.slice(0, visibleProductCount);

  useEffect(() => {
    setVisibleProductCount(productsPerPage);
  }, [activeCategory, deferredSearch, sortOrder]);

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const subtotal = cart.reduce(
    (total, item) => {
      const currentProduct = products.find((product) => product._id === item._id);
      return total + (currentProduct?.price ?? item.price) * item.quantity;
    },
    0,
  );

  function addToCart(product) {
    setNotice("");
    setCart((current) => {
      const existing = current.find((item) => item._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) return current;
        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      if (product.stock < 1) return current;
      return [...current, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  }

  function changeQuantity(productId, amount) {
    setCart((current) =>
      current
        .map((item) =>
          item._id === productId
            ? {
                ...item,
                quantity: Math.min(item.stock, item.quantity + amount),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item._id !== productId));
  }

  async function startCheckout(event) {
    event.preventDefault();
    setCheckoutError("");
    setIsSubmitting(true);

    try {
      const { data } = await axios.post(`${API}/orders`, {
        customer: shipping,
        paymentMethod,
        ...(paymentMethod === "easypaisa" ? { paymentReference } : {}),
        items: cart.map(({ _id, quantity }) => ({
          productId: _id,
          quantity,
        })),
      }, account?.token ? { headers: { Authorization: `Bearer ${account.token}` } } : undefined);
      setOrderReceipt(data);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      if (account?.token) loadOrders();
    } catch (requestError) {
      setCheckoutError(
        requestError.response?.data?.message ||
          requestError.message ||
          "We couldn’t place your order. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  function updateShipping(event) {
    setShipping((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  if (route === "/login" || route === "/signup") {
    return <AuthPage mode={route.slice(1)} onSubmit={submitAccount} onNavigate={navigate} busy={accountBusy} error={accountError} />;
  }

  return (
    <main>
      <div className="announcement">
        Great finds, everyday prices · Cash on delivery across Pakistan
      </div>

      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="The Good Market home">
          THE <span>GOOD MARKET</span>
        </a>
        <form className="market-search" ref={searchContainerRef} role="search" onSubmit={submitSearch}>
          <div className="market-search-control">
            <Icon name="search" size={19} />
            <input type="search" role="combobox" aria-label="Search products and categories" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls="market-search-suggestions" placeholder="Search products, brands and categories" value={search} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); setActiveSearchSuggestion(-1); }} onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setSearchOpen(true); setActiveSearchSuggestion((index) => Math.min(index + 1, searchSuggestions.length - 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveSearchSuggestion((index) => Math.max(index - 1, 0)); }
              if (event.key === "Escape") setSearchOpen(false);
            }} />
            {search && <button className="market-search-clear" type="button" aria-label="Clear search" onClick={() => { setSearch(""); setActiveSearchSuggestion(-1); setSearchOpen(true); }}>×</button>}
          </div>
          <button className="market-search-submit" type="submit" aria-label="Search"><Icon name="search" size={20} /><span>Search</span></button>
          {searchOpen && <div className="market-search-dropdown" id="market-search-suggestions" role="listbox">{searchSuggestions.length ? <>{!search.trim() && <p className="search-dropdown-label">Popular categories & finds</p>}{searchSuggestions.map((suggestion, index) => <button className={activeSearchSuggestion === index ? "search-suggestion active" : "search-suggestion"} type="button" role="option" aria-selected={activeSearchSuggestion === index} key={`${suggestion.type}-${suggestion.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSearchSuggestion(suggestion)}><span className="suggestion-kind">{suggestion.type === "category" ? "Category" : "Product"}</span><span>{suggestion.label}</span>{suggestion.type === "product" && <small>{money.format(suggestion.product.price)}</small>}</button>)}</> : <p className="search-no-results">No matching products or categories. Press Search to see results.</p>}</div>}
        </form>
        <div className="header-actions">
          {account?.user ? (
            <button className="account-button" type="button" onClick={() => { setAccountOpen(true); setSellerView(false); setStoreSetupView(false); setAccountError(""); loadOrders(); }}>
              {account.user.name.split(" ")[0]}
            </button>
          ) : (
            <>
              <button className="account-button" type="button" onClick={() => { setAuthMode("login"); navigate("/login"); }}>Sign in</button>
              <button className="account-button account-signup" type="button" onClick={() => { setAuthMode("signup"); navigate("/signup"); }}>Sign up</button>
            </>
          )}
          <button className="wishlist-header-button" type="button" onClick={() => setWishlistOpen(true)} aria-label={`Open wishlist, ${wishlist.length} items`}>
            <Icon name="heart" size={19} /><span>Saved</span><span className="bag-count">{wishlist.length}</span>
          </button>
          <button
            className="bag-button"
            type="button"
            aria-label={`Open shopping bag, ${cartCount} items`}
            onClick={() => setIsCartOpen(true)}
          >
            <Icon name="bag" />
            <span>Bag</span>
            <span className="bag-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <nav className="market-category-nav" id="categories" aria-label="Shop product categories">
        <button className={activeCategory === allCategoriesLabel ? "market-category active" : "market-category"} type="button" onClick={() => { setActiveCategory(allCategoriesLabel); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }}>All finds</button>
        {categories.filter((category) => category !== allCategoriesLabel).map((category) => (
          <button className={activeCategory === category ? "market-category active" : "market-category"} type="button" key={category} onClick={() => { setActiveCategory(category); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }}>{category}</button>
        ))}
        <a className="category-special-link" href="#deals">Deals</a>
        <a className="category-special-link" href="#stores">Start selling</a>
      </nav>

      {notice && (
        <div className="notice" role="status">
          <Icon name="check" size={18} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={17} />
          </button>
        </div>
      )}

      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow"><span /> The good things, all in one place</p>
          <h1>Find your next <em>favourite thing.</em></h1>
          <p className="hero-description">
            Shop electronics, fashion, home finds, beauty, books and more from independent sellers across Pakistan.
          </p>
          <a className="text-link" href="#collection">
            Start exploring <Icon name="arrow" size={18} />
          </a>
          <div className="hero-note">
            <span className="hero-note-rule" />
            <span>Good finds from<br />stores worth knowing</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="A colourful collection of marketplace finds" role="img">
          <div className="hero-image" />
          <div className="hero-image-caption">
            <span>GOOD FINDS / EVERY DAY</span>
            <span>Shop something unexpected</span>
          </div>
        </div>
        <div className="hero-side-label">A LITTLE BIT OF EVERYTHING</div>
      </section>

      <section className="seller-invite" id="stores">
        <div><p className="eyebrow">A marketplace with more to explore</p><h2>Good finds.<br /><em>Good prices.</em></h2><p>From daily essentials to little discoveries, browse a growing mix of products from independent stores.</p></div>
        <button className="button button-dark" type="button" onClick={() => { if (!account?.user) { setAuthMode("signup"); navigate("/signup"); return; } setAccountOpen(true); setSellerView(false); setStoreSetupView(!account.user.store); }}>{account?.user?.store ? "Manage your store" : "Open your own store"} <Icon name="arrow" size={16} /></button>
      </section>

      <section className="trust-strip" id="craft" aria-label="Our service promises">
        <p>One marketplace, many independent stores</p>
        <span className="trust-divider" />
        <p>Cash on delivery or Easypaisa</p>
        <span className="trust-divider" />
        <p>New finds added regularly</p>
      </section>

      {dealProducts.length > 0 && (
        <section className="deals-section section-wrap" id="deals" aria-labelledby="deals-title">
          <div className="deals-heading"><div><p className="eyebrow">Good prices, right now</p><h2 id="deals-title">Today’s deals</h2></div><button className="deals-more" type="button" onClick={() => { setActiveCategory(allCategoriesLabel); setSearch(""); setSortOrder("featured"); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }}>See all products <Icon name="arrow" size={16} /></button></div>
          <div className="deals-grid">{dealProducts.map((product) => <button className="deal-card" type="button" key={product._id} onClick={() => setSelectedProduct(product)}><img src={product.image} alt="" loading="lazy" /><span className="deal-card-copy"><span className="deal-category">{product.category}</span><strong>{product.name}</strong><span className="deal-price">{money.format(product.price)} <del>{money.format(product.compareAtPrice)}</del></span><span className="deal-off">Save {Math.round((1 - product.price / product.compareAtPrice) * 100)}%</span></span></button>)}</div>
        </section>
      )}

      <section className="collection section-wrap" id="collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The marketplace</p>
            <h2>Good things, <em>for every day.</em></h2>
          </div>
          <p className="section-aside">
            Browse the latest finds across all your favourite categories, from trusted independent sellers.
          </p>
        </div>

        <div className="collection-tools">
          <div className="category-list" aria-label="Filter products by category">
            {categories.map((category) => (
              <button
                className={activeCategory === category ? "category active" : "category"}
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Icon name="search" size={17} />
            <span className="sr-only">Search watches</span>
            <input
              type="search"
                placeholder="Search all products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="sort-field">Sort by <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
        </div>

        {error && (
          <div className="error-panel" role="alert">
            <p>{error}</p>
            <button
              className="button button-dark"
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state" role="status">Finding good things…</div>
        ) : !error && filteredProducts.length === 0 ? (
          <div className="empty-collection">
            <h3>No products found</h3>
            <p>Try another search or choose a different collection.</p>
          </div>
        ) : (
          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <article className="product-card" key={product._id}>
                <div className="product-image-wrap">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                    loading={index > 2 ? "lazy" : "eager"}
                  />
                  <span className="product-category">{product.category}</span>
                  {product.compareAtPrice > product.price && <span className="product-deal">-{Math.round((1 - product.price / product.compareAtPrice) * 100)}%</span>}
                  <button className={wishlist.some((item) => item._id === product._id) ? "product-wishlist saved" : "product-wishlist"} type="button" aria-label={`${wishlist.some((item) => item._id === product._id) ? "Remove" : "Save"} ${product.name} ${wishlist.some((item) => item._id === product._id) ? "from" : "to"} wishlist`} aria-pressed={wishlist.some((item) => item._id === product._id)} onClick={() => toggleWishlist(product)}><Icon name="heart" size={18} /></button>
                  {product.stock < 1 && (
                    <span className="sold-out">Sold out</span>
                  )}
                  <button
                    className="quick-add"
                    type="button"
                    disabled={product.stock < 1}
                    aria-label={`Add ${product.name} to bag`}
                    onClick={() => addToCart(product)}
                  >
                    <Icon name="plus" size={19} />
                  </button>
                </div>
                <div className="product-details">
                  <div>
                    <button className="product-title-button" type="button" onClick={() => setSelectedProduct(product)}>{product.name}</button>
                    <span className="product-store">{product.storeName || "Atelier Horloger"}</span>
                    <p>{product.description}</p>
                    <button className="quick-view-link" type="button" onClick={() => setSelectedProduct(product)}>View details</button>
                  </div>
                  <span className="product-price-wrap"><span className="product-price">{money.format(product.price)}</span>{product.compareAtPrice > product.price && <span className="product-old-price">{money.format(product.compareAtPrice)}</span>}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && filteredProducts.length > visibleProducts.length && (
          <div className="load-more-wrap">
            <button className="button button-outline load-more-button" type="button" onClick={() => setVisibleProductCount((count) => Math.min(count + productsPerPage, filteredProducts.length))}>
              Load more products
            </button>
          </div>
        )}

        <p className="collection-footnote">
          Showing {visibleProducts.length} of {filteredProducts.length} good finds
        </p>
      </section>

      <section className="story" id="story">
        <div className="story-image" role="img" aria-label="A watchmaker at work on a mechanical timepiece" />
        <div className="story-copy">
          <p className="eyebrow">A marketplace made for discovery</p>
          <h2>Little shops.<br /><em>Lovely finds.</em></h2>
          <p>
            Meet independent sellers and discover the stories behind the products you bring home.
          </p>
          <a className="text-link" href="#collection">
            Browse the marketplace <Icon name="arrow" size={18} />
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <a className="wordmark footer-wordmark" href="#home">
          THE <span>GOOD MARKET</span>
        </a>
        <p>Find something good.</p>
        <a href="#collection">Shop all products <Icon name="arrow" size={16} /></a>
        <small>© 2026 The Good Market. Shop small, find more.</small>
      </footer>

      {selectedProduct && (
        <div className="overlay checkout-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
          <section className="product-detail-panel" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
            <button className="icon-button product-detail-close" type="button" aria-label="Close product details" onClick={() => setSelectedProduct(null)}><Icon name="close" /></button>
            <img src={selectedProduct.image} alt={selectedProduct.name} />
            <div className="product-detail-copy"><p className="eyebrow">{selectedProduct.category} · {selectedProduct.storeName || "Good Market Finds"}</p><h2 id="product-detail-title">{selectedProduct.name}</h2><p>{selectedProduct.description || "A good find from an independent marketplace seller."}</p><div className="product-detail-price"><strong>{money.format(selectedProduct.price)}</strong>{selectedProduct.compareAtPrice > selectedProduct.price && <del>{money.format(selectedProduct.compareAtPrice)}</del>}</div><p className="product-stock">{selectedProduct.stock > 0 ? `${selectedProduct.stock} in stock` : "Currently sold out"}</p><div className="product-detail-actions"><button className="button button-dark" type="button" disabled={selectedProduct.stock < 1} onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>Add to bag <Icon name="bag" size={17} /></button><button className={wishlist.some((item) => item._id === selectedProduct._id) ? "button button-outline saved" : "button button-outline"} type="button" onClick={() => toggleWishlist(selectedProduct)}><Icon name="heart" size={17} /> {wishlist.some((item) => item._id === selectedProduct._id) ? "Saved" : "Save for later"}</button></div></div>
          </section>
        </div>
      )}

      {wishlistOpen && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setWishlistOpen(false); }}>
          <aside className="cart-drawer wishlist-drawer" role="dialog" aria-modal="true" aria-labelledby="wishlist-title">
            <div className="drawer-header"><div><p className="eyebrow">Your saved finds</p><h2 id="wishlist-title">Wishlist <span>({wishlist.length})</span></h2></div><button className="icon-button" type="button" aria-label="Close wishlist" onClick={() => setWishlistOpen(false)}><Icon name="close" /></button></div>
            {wishlist.length ? <div className="wishlist-items">{wishlist.map((item) => <article className="wishlist-item" key={item._id}><img src={item.image} alt={item.name} /><div><span className="product-store">{item.storeName || item.category}</span><h3>{item.name}</h3><strong>{money.format(item.price)}</strong><button type="button" onClick={() => addWishlistItemToCart(item)}>Add to bag</button></div><button className="wishlist-remove" type="button" aria-label={`Remove ${item.name} from wishlist`} onClick={() => toggleWishlist(item)}><Icon name="close" size={17} /></button></article>)}</div> : <div className="cart-empty"><div className="empty-bag-icon"><Icon name="heart" size={26} /></div><h3>Save a find for later.</h3><p>Tap the heart on anything you like and it will be waiting here.</p></div>}
          </aside>
        </div>
      )}

      {accountOpen && (
        <div className="overlay checkout-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
          <section className="checkout-panel account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <div className="drawer-header">
              <div><p className="eyebrow">A marketplace of makers</p><h2 id="account-title">{account?.user?.store ? (sellerView ? "Your store" : "Your account") : account ? "Your account" : authMode === "signup" ? "Create an account" : "Welcome back"}</h2></div>
              <button className="icon-button" type="button" aria-label="Close account" onClick={() => setAccountOpen(false)}><Icon name="close" /></button>
            </div>
            {accountError && <p className="form-error" role="alert">{accountError}</p>}
            {!account ? (
              <>
                <p className="checkout-intro">{authMode === "signup" ? "Join to shop from independent stores or open your own." : "Sign in to manage your account or your store."}</p>
                <form className="checkout-form account-form" onSubmit={submitAccount}>
                  {authMode === "signup" && <label className="full-field">Your name<input name="name" autoComplete="name" required maxLength="80" /></label>}
                  <label className="full-field">Email address<input name="email" type="email" autoComplete="email" required /></label>
                  <label className="full-field">Password<input name="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength="8" required /></label>
                  <button className="button button-dark full-field" type="submit" disabled={accountBusy}>{accountBusy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"} <Icon name="arrow" size={16} /></button>
                </form>
                <p className="account-switch">{authMode === "signup" ? "Already have an account?" : "New to the marketplace?"} <button type="button" onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAccountError(""); }}>{authMode === "signup" ? "Sign in" : "Create an account"}</button></p>
              </>
            ) : storeSetupView ? (
              <>
                <p className="checkout-intro">Welcome, {account.user.name}. Create your store and start sharing what you make.</p>
                <form className="checkout-form account-form" onSubmit={(event) => createSellerResource(event, "store")}>
                  <label className="full-field">Store name<input name="name" required maxLength="80" placeholder="A name shoppers will remember" /></label>
                  <label className="full-field">About your store<textarea name="description" maxLength="500" rows="3" placeholder="Tell shoppers what makes your store special" /></label>
                  <button className="button button-dark full-field" type="submit" disabled={accountBusy}>{accountBusy ? "Creating…" : "Create my store"} <Icon name="arrow" size={16} /></button>
                </form>
                <button className="account-logout" type="button" onClick={() => setAccount(null)}>Sign out</button>
              </>
            ) : sellerView ? (
              <>
                <div className="seller-products-heading"><div><p className="eyebrow">{account.user.store.name}</p><h3>Your products <span>({sellerProducts.length})</span></h3></div><button className="account-back" type="button" onClick={() => setSellerView(false)}>Account</button></div>
                <form className="checkout-form account-form seller-product-form" onSubmit={(event) => createSellerResource(event, "product")}>
                  <label className="full-field">Product name<input name="name" required maxLength="120" /></label>
                  <label className="full-field">Description<input name="description" maxLength="500" /></label>
                  <label>Price (PKR)<input name="price" type="number" min="0" step="1" required /></label>
                  <label>Stock<input name="stock" type="number" min="0" step="1" required /></label>
                  <label>Category<input name="category" required placeholder="e.g. Handmade" /></label>
                  <label>Image URL<input name="image" type="url" /></label>
                  <button className="button button-dark full-field" type="submit" disabled={accountBusy}>{accountBusy ? "Publishing…" : "Publish product"} <Icon name="arrow" size={16} /></button>
                </form>
                <div className="seller-product-list">{sellerProducts.length ? sellerProducts.map((product) => <div key={product._id}><span>{product.name}</span><strong>{money.format(product.price)}</strong></div>) : <p>Your store is ready. Add your first product above.</p>}</div>
              </>
            ) : (
              <div className="account-dashboard">
                <p className="eyebrow">Your marketplace account</p><h3>Hello, {account.user.name}</h3><p>{account.user.email}</p>
                <div className="account-actions-row">
                  {account.user.store ? <button className="button button-dark" type="button" onClick={async () => { try { const { data } = await axios.get(`${API}/products/seller/mine`, { headers: { Authorization: `Bearer ${account.token}` } }); setSellerProducts(data); setSellerView(true); } catch (e) { setAccountError(e.response?.data?.message || "Could not load your products."); } }}>Manage my store</button> : <button className="button button-dark" type="button" onClick={() => setStoreSetupView(true)}>Open a store</button>}
                  <button className="button button-outline" type="button" onClick={loadOrders}>Refresh orders</button>
                </div>
                <div className="account-orders"><h3>My orders</h3>{ordersLoading ? <p>Loading your orders…</p> : ordersError ? <p className="form-error">{ordersError}</p> : orders.length ? orders.map((order) => <article className="account-order" key={order._id}><div><strong>Order #{String(order._id).slice(-8).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><div><strong>{money.format(order.totalAmount)}</strong><span className="order-status">{order.paymentStatus.replaceAll("_", " ")}</span></div><p>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</p></article>) : <p>Your orders will appear here after checkout.</p>}</div>
                <button className="account-logout" type="button" onClick={() => { setAccount(null); setOrders([]); setAccountOpen(false); }}>Sign out</button>
              </div>
            )}
          </section>
        </div>
      )}

      {isCartOpen && (
        <div className="overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsCartOpen(false);
        }}>
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Your selection</p>
                <h2 id="cart-title">Your bag <span>({cartCount})</span></h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close shopping bag"
                onClick={() => setIsCartOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="empty-bag-icon"><Icon name="bag" size={28} /></div>
                <h3>Your next favourite is waiting.</h3>
                <p>Your bag is currently empty. Take a look at the collection.</p>
                <button
                  className="button button-dark"
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                >
                  Explore watches <Icon name="arrow" size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => {
                    const currentProduct =
                      products.find((product) => product._id === item._id) || item;

                    return (
                    <article className="cart-item" key={item._id}>
                      <img src={currentProduct.image} alt="" />
                      <div className="cart-item-info">
                        <h3>{currentProduct.name}</h3>
                        <p>{money.format(currentProduct.price)}</p>
                        <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => changeQuantity(item._id, -1)}
                          >
                            <Icon name="minus" size={15} />
                          </button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Add one ${item.name}`}
                            disabled={item.quantity >= currentProduct.stock}
                            onClick={() => changeQuantity(item._id, 1)}
                          >
                            <Icon name="plus" size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="cart-item-end">
                        <strong>{money.format(currentProduct.price * item.quantity)}</strong>
                        <button
                          className="remove-link"
                          type="button"
                          onClick={() => removeFromCart(item._id)}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                    );
                  })}
                </div>
                <div className="cart-summary">
                  <div className="subtotal-row">
                    <span>Subtotal</span>
                    <strong>{money.format(subtotal)}</strong>
                  </div>
                  <p>Prices shown in PKR. Delivery is included.</p>
                  <button
                    className="button button-dark checkout-button"
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                  >
                    Continue to checkout <Icon name="arrow" size={17} />
                  </button>
                  <div className="secure-note"><Icon name="check" size={15} /> Secure ordering across Pakistan</div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="overlay checkout-overlay">
          <section
            className="checkout-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            aria-describedby="checkout-description"
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Almost yours</p>
                <h2 id="checkout-title">Delivery details</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close checkout"
                onClick={() => setIsCheckoutOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="checkout-intro" id="checkout-description">
              Add your delivery details and choose how you’d like to pay.
            </p>
            <form className="checkout-form" onSubmit={startCheckout}>
              <label>
                Full name
                <input name="name" value={shipping.name} onChange={updateShipping} autoComplete="name" required />
              </label>
              <label>
                Email address
                <input name="email" type="email" value={shipping.email} onChange={updateShipping} autoComplete="email" required />
              </label>
              <label className="full-field">
                Street address
                <input name="address" value={shipping.address} onChange={updateShipping} autoComplete="street-address" required />
              </label>
              <label>
                City
                <input name="city" value={shipping.city} onChange={updateShipping} autoComplete="address-level2" required />
              </label>
              <label>
                Postal code
                <input name="postalCode" value={shipping.postalCode} onChange={updateShipping} autoComplete="postal-code" required />
              </label>
              <label className="full-field">
                Country
                <input name="country" value={shipping.country} onChange={updateShipping} autoComplete="country-name" required />
              </label>
              <fieldset className="payment-methods full-field">
                <legend>Payment method</legend>
                <label className={paymentMethod === "cod" ? "payment-option selected" : "payment-option"}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <span className="payment-option-copy">
                    <strong>Cash on delivery</strong>
                    <span>Pay the rider when your watch arrives.</span>
                  </span>
                </label>
                {paymentConfig.easypaisa.enabled ? (
                  <label className={paymentMethod === "easypaisa" ? "payment-option selected" : "payment-option"}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="easypaisa"
                      checked={paymentMethod === "easypaisa"}
                      onChange={() => setPaymentMethod("easypaisa")}
                    />
                    <span className="payment-option-copy">
                      <strong>Pay with Easypaisa</strong>
                      <span>Transfer the total, then enter your receipt’s transaction ID.</span>
                    </span>
                  </label>
                ) : (
                  <div className="payment-option payment-option-disabled">
                    <span className="payment-option-copy">
                      <strong>Easypaisa</strong>
                      <span>Add your Easypaisa merchant account in backend/.env to enable wallet transfers.</span>
                    </span>
                  </div>
                )}
              </fieldset>
              {paymentMethod === "easypaisa" && paymentConfig.easypaisa.enabled && (
                <>
                  <div className="easypaisa-instructions full-field">
                    <strong>Send {money.format(subtotal)} to this Easypaisa account</strong>
                    <span>Account name: {paymentConfig.easypaisa.accountTitle}</span>
                    <span>Account number: {paymentConfig.easypaisa.accountNumber}</span>
                    <small>After paying, enter the transaction ID from your Easypaisa receipt below. We’ll confirm the transfer manually before dispatch.</small>
                  </div>
                  <label className="full-field">
                    Easypaisa transaction ID
                    <input
                      name="paymentReference"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      minLength="6"
                      maxLength="40"
                      autoComplete="off"
                      required
                    />
                  </label>
                </>
              )}
              {paymentConfigError && (
                <p className="form-error full-field" role="status">{paymentConfigError}</p>
              )}
              {checkoutError && <p className="form-error full-field" role="alert">{checkoutError}</p>}
              <div className="checkout-total full-field">
                <span>Order total</span>
                <strong>{money.format(subtotal)}</strong>
              </div>
              <button className="button button-dark checkout-button full-field" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Placing your order…"
                  : paymentMethod === "cod"
                    ? "Place order · cash on delivery"
                    : "Submit Easypaisa payment for verification"}
                {!isSubmitting && <Icon name="arrow" size={17} />}
              </button>
              <p className="checkout-footnote full-field">
                {paymentMethod === "cod"
                  ? "No online payment is needed. Pay the delivery rider when your order arrives."
                  : "Your transfer is not marked as paid until our team verifies the transaction ID."}
              </p>
            </form>
          </section>
        </div>
      )}
      {orderReceipt && (
        <div className="overlay checkout-overlay">
          <section
            className="checkout-panel order-receipt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
          >
            <div className="receipt-check"><Icon name="check" size={25} /></div>
            <p className="eyebrow">Order received</p>
            <h2 id="receipt-title">Thank you for your order.</h2>
            <p>Order <strong>#{orderReceipt.orderNumber}</strong> · {money.format(orderReceipt.totalAmount)}</p>
            {orderReceipt.paymentMethod === "cod" ? (
              <div className="easypaisa-instructions">
                <strong>Pay cash on delivery</strong>
                <span>Your watch is reserved. Pay the courier when it arrives.</span>
              </div>
            ) : (
              <div className="easypaisa-instructions">
                <strong>Easypaisa payment awaiting verification</strong>
                <span>We’ll verify transaction ID {orderReceipt.paymentReference || "on your receipt"} before dispatch.</span>
                <span>Account name: {orderReceipt.easypaisa.accountTitle}</span>
                <span>Account number: {orderReceipt.easypaisa.accountNumber}</span>
              </div>
            )}
            <button className="button button-dark checkout-button" type="button" onClick={() => setOrderReceipt(null)}>
              Continue browsing <Icon name="arrow" size={17} />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
