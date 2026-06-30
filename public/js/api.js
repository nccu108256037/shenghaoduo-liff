const API = (() => {
  const config = window.SHENG_HAO_DUO_CONFIG;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function timeoutFetch(url, options = {}, timeout = 18000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async function fetchJsonWithRetry(url, options = {}, retry = 2) {
    let lastError = null;

    for (let i = 0; i <= retry; i++) {
      try {
        const res = await timeoutFetch(url, options);

        const text = await res.text();

        if (!res.ok) {
          throw new Error(`伺服器回應錯誤：${res.status}`);
        }

        try {
          return JSON.parse(text);
        } catch (err) {
          throw new Error('伺服器回傳格式錯誤，請重新整理');
        }

      } catch (err) {
        lastError = err;

        if (i < retry) {
          await sleep(700 + i * 800);
          continue;
        }
      }
    }

    throw lastError || new Error('讀取失敗');
  }

  async function request(action, payload = {}) {
    const url = config.GOOGLE_SCRIPT_URL;

    if (!url || url.includes('請填入')) {
      throw new Error('尚未設定 Google Apps Script Web App URL');
    }

    if (action === 'products') {
      return fetchJsonWithRetry(`${url}?action=products`, {
        method: 'GET',
        cache: 'default'
      }, 2);
    }

    return fetchJsonWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    }, 1);
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
