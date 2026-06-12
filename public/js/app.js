const state = {
  products: [],
  filtered: [],
  category: '全部',
  keyword: '',
  cart: JSON.parse(localStorage.getItem('shd_cart') || '{}'),
  liffProfile: null
};

const $ = (id) => document.getElementById(id);
const money = (n) => `$${Number(n || 0).toLocaleString('zh-TW')}`;
const placeholder = 'https://placehold.co/600x600/FFF3E8/EC7F32?text=%E7%9C%81%E5%A5%BD%E5%A4%9A';

function saveCart() {
  localStorage.setItem('shd_cart', JSON.stringify(state.cart));
  renderCartBadge();
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 1800);
}

async function initLiff() {
  const { LIFF_ID } = window.SHENG_HAO_DUO_CONFIG;
  if (!LIFF_ID || LIFF_ID.includes('請填入')) return;

  try {
    await liff.init({ liffId: LIFF_ID });
    if (liff.isLoggedIn()) {
      state.liffProfile = await liff.getProfile();
    }
  } catch (err) {
    console.warn('LIFF 初始化失敗，仍可用瀏覽器測試', err);
  }
}

async function loadProducts() {
  try {
    const data = await API.getProducts();

    state.products = (data.products || []).map(p => ({
      id: String(p.id || ''),
      name: String(p.name || ''),
      category: String(p.category || '其他'),
      price: Number(p.price || 0),
      image: String(p.image || placeholder),
      stock: Number(p.stock || 0),
      tags: String(p.tags || ''),
      isFeatured: String(p.isFeatured || '').toUpperCase() === 'TRUE'
    })).filter(p => p.id && p.name);

    applyFilter();
    renderFeaturedList();
    renderCategories();
  } catch (err) {
    console.error(err);
    $('productGrid').innerHTML = '<div class="empty">商品讀取失敗，請確認 Apps Script URL 與 Products 工作表。</div>';
  }
}

function applyFilter() {
  const kw = state.keyword.trim().toLowerCase();

  state.filtered = state.products.filter(p => {
    const matchCategory = state.category === '全部' || p.category === state.category;
    const text = `${p.name} ${p.category} ${p.tags}`.toLowerCase();
    return matchCategory && (!kw || text.includes(kw));
  });

  renderProducts();
}

function renderFeaturedList() {
  const featuredProducts = state.products
    .filter(p => p.isFeatured)
    .slice(0, 10);

  $('quickList').innerHTML = featuredProducts.length
    ? featuredProducts.map(productCardSmall).join('')
    : '<div class="empty">近期熱門商品整理中</div>';
}

function renderCategories() {
  const categories = ['全部', ...new Set(state.products.map(p => p.category).filter(Boolean))];

  $('categoryList').innerHTML = categories.map(c => `
    <button class="category-chip ${c === state.category ? 'active' : ''}" data-category="${c}">
      ${c}
    </button>
  `).join('');
}

function productCardSmall(p) {
  return `
    <article class="quick-card">
      <img src="${p.image || placeholder}" alt="${p.name}" onerror="this.src='${placeholder}'" />
      <h3>${p.name}</h3>
      <div class="price">${money(p.price)}</div>
      <button class="add-btn" data-add="${p.id}">加入</button>
    </article>
  `;
}

function productCard(p) {
  return `
    <article class="product-card">
      <img src="${p.image || placeholder}" alt="${p.name}" onerror="this.src='${placeholder}'" />
      <div class="product-meta">
        <h3>${p.name}</h3>
        <div class="muted">${p.category}</div>
      </div>
      <div class="price">${money(p.price)}</div>
      <button class="add-btn" data-add="${p.id}">加入購物車</button>
    </article>
  `;
}

function renderProducts() {
  $('productTotal').textContent = `${state.filtered.length} 件`;
  $('productGrid').innerHTML = state.filtered.length
    ? state.filtered.map(productCard).join('')
    : '<div class="empty">找不到商品，可以直接傳訊息給客服。</div>';
}

function addToCart(productId) {
  state.cart[productId] = (state.cart[productId] || 0) + 1;
  saveCart();
  toast('已加入購物車');
}

function changeQty(productId, delta) {
  const next = (state.cart[productId] || 0) + delta;

  if (next <= 0) {
    delete state.cart[productId];
  } else {
    state.cart[productId] = next;
  }

  saveCart();
  renderCart();
}

function getCartItems() {
  return Object.entries(state.cart).map(([id, qty]) => {
    const product = state.products.find(p => p.id === id);
    return product ? { ...product, qty, subtotal: product.price * qty } : null;
  }).filter(Boolean);
}

function renderCartBadge() {
  const count = Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
  $('cartCount').textContent = count;
}

function renderCart() {
  const items = getCartItems();

  $('cartItems').innerHTML = items.length ? items.map(item => `
    <div class="cart-item">
      <img src="${item.image || placeholder}" alt="${item.name}" onerror="this.src='${placeholder}'" />
      <div>
        <strong>${item.name}</strong>
        <div class="muted">${money(item.price)} / 小計 ${money(item.subtotal)}</div>
        <div class="qty-row">
          <button class="qty-btn" data-qty-id="${item.id}" data-delta="-1">−</button>
          <strong>${item.qty}</strong>
          <button class="qty-btn" data-qty-id="${item.id}" data-delta="1">＋</button>
        </div>
      </div>
    </div>
  `).join('') : '<div class="empty">購物車目前是空的</div>';

  $('cartTotal').textContent = money(items.reduce((sum, item) => sum + item.subtotal, 0));
}

function renderCheckout() {
  const items = getCartItems();

  $('checkoutItems').innerHTML = items.map(item => `
    <div class="summary-line">
      <span>${item.name} × ${item.qty}</span>
      <span>${money(item.subtotal)}</span>
    </div>
  `).join('');

  $('checkoutTotal').textContent = money(items.reduce((sum, item) => sum + item.subtotal, 0));
}

async function submitOrder(event) {
  event.preventDefault();

  const items = getCartItems();
  if (!items.length) return toast('購物車是空的');

  const btn = $('submitOrderBtn');
  btn.disabled = true;
  btn.textContent = '送出中...';

  try {
    const payload = {
      customer: {
        name: $('customerName').value.trim(),
        phone: $('customerPhone').value.trim(),
        address: $('customerAddress').value.trim()
      },
      line: {
        userId: state.liffProfile?.userId || '',
        displayName: state.liffProfile?.displayName || ''
      },
      items: items.map(({ id, name, price, qty, subtotal }) => ({
        id,
        name,
        price,
        qty,
        subtotal
      })),
      total: items.reduce((sum, item) => sum + item.subtotal, 0)
    };

    const result = await API.createOrder(payload);

    if (!result.ok) {
      throw new Error(result.message || '訂單寫入失敗');
    }

    state.cart = {};
    saveCart();

    const lineMessage = `我已完成訂單
訂單編號：${result.orderId}
姓名：${payload.customer.name}
電話：${payload.customer.phone}
地址：${payload.customer.address}
金額：${money(payload.total)}
請協助核對，謝謝！`;

    const lineUrl = `https://line.me/R/oaMessage/@savego/?${encodeURIComponent(lineMessage)}`;

    $('checkoutPage').innerHTML = `
      <div class="success-page">
        <div class="success-icon">✅</div>
        <h2>訂單已送出！</h2>
        <p>感謝您的訂購，我們會盡快為您處理。</p>

        <div class="success-card">
          <div>訂單編號</div>
          <strong>${result.orderId}</strong>

          <div>訂單金額</div>
          <strong>${money(payload.total)}</strong>

          <div>收件人</div>
          <strong>${payload.customer.name}</strong>

          <div>電話</div>
          <strong>${payload.customer.phone}</strong>
        </div>

        <p class="notice-text">
          請點下方按鈕通知客服核對訂單。
        </p>

        <a class="line-notify-btn" href="${lineUrl}">
          我已完成訂單，通知客服
        </a>
      </div>
    `;

  } catch (err) {
    console.error(err);
    toast(err.message || '送出失敗');
  } finally {
    btn.disabled = false;
    btn.textContent = '送出訂單';
  }
}

function bindEvents() {
  $('searchInput').addEventListener('input', e => {
    state.keyword = e.target.value;
    applyFilter();
  });

  $('reloadBtn').addEventListener('click', loadProducts);

  $('cartBtn').addEventListener('click', () => {
    renderCart();
    $('cartDrawer').classList.remove('hidden');
  });

  $('checkoutBtn').addEventListener('click', () => {
    if (!getCartItems().length) return toast('請先加入商品');

    $('cartDrawer').classList.add('hidden');
    renderCheckout();
    $('checkoutPage').classList.remove('hidden');
  });

  $('backHomeBtn').addEventListener('click', () => {
    $('checkoutPage').classList.add('hidden');
  });

  $('checkoutForm').addEventListener('submit', submitOrder);

  document.body.addEventListener('click', e => {
    const addId = e.target.dataset.add;
    if (addId) addToCart(addId);

    const category = e.target.dataset.category;
    if (category) {
      state.category = category;
      renderCategories();
      applyFilter();
    }

    const close = e.target.dataset.close;
    if (close === 'cart') {
      $('cartDrawer').classList.add('hidden');
    }

    const qtyId = e.target.dataset.qtyId;
    if (qtyId) {
      changeQty(qtyId, Number(e.target.dataset.delta));
    }
  });
}

(async function boot() {
  bindEvents();
  renderCartBadge();
  await initLiff();
  await loadProducts();
})();
