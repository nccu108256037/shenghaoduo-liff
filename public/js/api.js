const API = (() => {
  const config = window.SHENG_HAO_DUO_CONFIG;

  function timeoutFetch(url, options = {}, timeout = 15000) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('讀取逾時，請重新整理一次')), timeout)
      )
    ]);
  }

  async function request(action, payload = {}) {
    const url = config.GOOGLE_SCRIPT_URL;

    if (!url || url.includes('請填入')) {
      throw new Error('尚未設定 Google Apps Script Web App URL');
    }

    if (action === 'products') {
      const res = await timeoutFetch(`${url}?action=products`, {
        method: 'GET',
        cache: 'default'
      });

      if (!res.ok) {
        throw new Error('讀取商品失敗');
      }

      return res.json();
    }

    const res = await timeoutFetch(url, {
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

  return {
    getProducts: () => request('products'),

    createOrder: (payload) =>
      request('createOrder', payload),

    verifyCoupon: (code, lineUserId, phone) =>
      request('verifyCoupon', {
        code,
        lineUserId,
        phone
      }),

    getOrders: (payload) =>
      request('getOrders', payload),

    updateOrderStatus: (payload) =>
      request('updateOrderStatus', payload),

    adminLogin: (payload) =>
      request('adminLogin', payload)
  };
})();
