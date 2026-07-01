const API = (() => {
  const config = window.SHENG_HAO_DUO_CONFIG;

  async function requestGoogle(action, payload = {}) {
    const url = config.GOOGLE_SCRIPT_URL;

    if (!url || url.includes('請填入')) {
      throw new Error('尚未設定 Google Apps Script Web App URL');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    if (!res.ok) {
      throw new Error('送出失敗');
    }

    return res.json();
  }

  async function requestSupabase(path, options = {}) {
    const baseUrl = config.SUPABASE_URL;
    const anonKey = config.SUPABASE_ANON_KEY;

    if (!baseUrl || !anonKey) {
      throw new Error('尚未設定 Supabase 連線資料');
    }

    const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Supabase 讀取失敗');
    }

    return res.json();
  }

  async function getProducts() {
    const rows = await requestSupabase(
      'products?select=*&is_visible=eq.true&order=sort.asc,name.asc'
    );

    return {
      ok: true,
      products: rows.map(p => ({
        id: String(p.id || ''),
        name: String(p.name || ''),
        category: String(p.category || '其他'),
        price: Number(p.price || 0),
        image: String(p.image || ''),
        stock: Number(p.stock || 0),
        tags: String(p.tags || ''),
        isFeatured: Boolean(p.is_featured)
      }))
    };
  }

  return {
    getProducts,

    createOrder: (payload) =>
      requestGoogle('createOrder', payload),

    verifyCoupon: (code, lineUserId, phone) =>
      requestGoogle('verifyCoupon', {
        code,
        lineUserId,
        phone
      }),

    getOrders: (payload) =>
      requestGoogle('getOrders', payload),

    updateOrderStatus: (payload) =>
      requestGoogle('updateOrderStatus', payload),

    adminLogin: (payload) =>
      requestGoogle('adminLogin', payload)
  };
})();
