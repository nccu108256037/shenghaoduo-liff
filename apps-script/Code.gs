const SHEET_ID = '請填入你的 Google Sheet ID';

const PRODUCTS_SHEET = 'Products';
const ORDERS_SHEET = 'Orders';
const ADMINS_SHEET = 'Admins';

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'products') {
    return jsonOutput({
      ok: true,
      products: getProducts_()
    });
  }

  return jsonOutput({
    ok: false,
    message: 'Unknown action'
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');

    if (body.action === 'createOrder') {
      return jsonOutput(createOrder_(body));
    }

    if (body.action === 'adminLogin') {
      return jsonOutput(adminLogin_(body));
    }

    if (body.action === 'getOrders') {
      return jsonOutput(getOrders_(body));
    }

    if (body.action === 'updateOrderStatus') {
      return jsonOutput(updateOrderStatus_(body));
    }

    return jsonOutput({
      ok: false,
      message: 'Unknown action'
    });

  } catch (err) {
    return jsonOutput({
      ok: false,
      message: err.message
    });
  }
}

/* =====================
   商品資料
===================== */

function getProducts_() {
  const sheet = SpreadsheetApp
    .openById(SHEET_ID)
    .getSheetByName(PRODUCTS_SHEET);

  if (!sheet) {
    throw new Error('找不到 Products 工作表');
  }

  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);

  return values
    .filter(row => row.join(''))
    .map(row => {
      const item = {};
      headers.forEach((h, i) => item[h] = row[i]);
      return item;
    });
}

/* =====================
   建立訂單
===================== */

function createOrder_(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(ORDERS_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(ORDERS_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'createdAt',
      'orderId',
      'lineUserId',
      'lineName',
      'name',
      'phone',
      'address',
      'itemsJson',
      'total',
      'status'
    ]);
  }

  ensureOrderStatusColumn_(sheet);

  const orderId =
    'SHD' +
    Utilities.formatDate(
      new Date(),
      'Asia/Taipei',
      'yyyyMMddHHmmss'
    ) +
    Math.floor(Math.random() * 1000);

  const customer = body.customer || {};
  const line = body.line || {};
  const items = body.items || [];
  const total = Number(body.total || 0);

  if (!customer.name || !customer.phone || !customer.address) {
    throw new Error('姓名、電話、地址不可空白');
  }

  if (!items.length) {
    throw new Error('訂單沒有商品');
  }

  sheet.appendRow([
    new Date(),
    orderId,
    line.userId || '',
    line.displayName || '',
    customer.name,
    customer.phone,
    customer.address,
    JSON.stringify(items),
    total,
    '已下訂'
  ]);

  return {
    ok: true,
    orderId
  };
}

/* =====================
   管理員登入
===================== */

function adminLogin_(body) {
  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();

  if (!username || !password) {
    throw new Error('請輸入帳號與密碼');
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ADMINS_SHEET);

  if (!sheet) {
    throw new Error('找不到 Admins 工作表');
  }

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    throw new Error('Admins 尚未設定帳號');
  }

  const headers = values.shift().map(String);

  const rows = values
    .filter(row => row.join(''))
    .map(row => {
      const item = {};
      headers.forEach((h, i) => item[h] = row[i]);
      return item;
    });

  const admin = rows.find(row =>
    String(row.username || '').trim() === username &&
    String(row.password || '').trim() === password &&
    String(row.enabled || '').toUpperCase() === 'TRUE'
  );

  if (!admin) {
    throw new Error('帳號或密碼錯誤，或帳號未啟用');
  }

  return {
    ok: true,
    token: Utilities.getUuid(),
    user: {
      username: String(admin.username || ''),
      name: String(admin.name || ''),
      role: String(admin.role || 'staff')
    }
  };
}

/* =====================
   後台讀取訂單
===================== */

function getOrders_(body) {
  checkAdminToken_(body);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET);

  if (!sheet) {
    return {
      ok: true,
      orders: []
    };
  }

  ensureOrderStatusColumn_(sheet);

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return {
      ok: true,
      orders: []
    };
  }

  const headers = values.shift().map(String);

  const orders = values
    .filter(row => row.join(''))
    .map((row, index) => {
      const item = {};
      headers.forEach((h, i) => item[h] = row[i]);

      let items = [];

      try {
        items = JSON.parse(item.itemsJson || '[]');
      } catch (err) {
        items = [];
      }

      return {
        rowNumber: index + 2,
        createdAt: formatDate_(item.createdAt),
        orderId: String(item.orderId || ''),
        lineName: String(item.lineName || ''),
        name: String(item.name || ''),
        phone: String(item.phone || ''),
        address: String(item.address || ''),
        items,
        total: Number(item.total || 0),
        status: String(item.status || '已下訂')
      };
    })
    .reverse();

  return {
    ok: true,
    orders
  };
}

/* =====================
   後台更新訂單狀態
===================== */

function updateOrderStatus_(body) {
  checkAdminToken_(body);

  const orderId = String(body.orderId || '').trim();
  const status = String(body.status || '').trim();

  const allowedStatus = [
    '已下訂',
    '已聯繫客服',
    '配送中',
    '已完成'
  ];

  if (!orderId) {
    throw new Error('缺少訂單編號');
  }

  if (!allowedStatus.includes(status)) {
    throw new Error('不允許的訂單狀態');
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET);

  if (!sheet) {
    throw new Error('找不到 Orders 工作表');
  }

  ensureOrderStatusColumn_(sheet);

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  const orderIdCol = headers.indexOf('orderId') + 1;
  const statusCol = headers.indexOf('status') + 1;

  if (!orderIdCol || !statusCol) {
    throw new Error('Orders 欄位缺少 orderId 或 status');
  }

  for (let r = 2; r <= values.length; r++) {
    const currentOrderId =
      String(sheet.getRange(r, orderIdCol).getValue() || '').trim();

    if (currentOrderId === orderId) {
      sheet.getRange(r, statusCol).setValue(status);

      return {
        ok: true,
        orderId,
        status
      };
    }
  }

  throw new Error('找不到訂單');
}

/* =====================
   工具
===================== */

function ensureOrderStatusColumn_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(String);

  if (!headers.includes('status')) {
    sheet
      .getRange(1, headers.length + 1)
      .setValue('status');
  }
}

function checkAdminToken_(body) {
  const token = String(body.token || '').trim();

  if (!token) {
    throw new Error('尚未登入後台');
  }

  return true;
}

function formatDate_(value) {
  if (!value) return '';

  try {
    return Utilities.formatDate(
      new Date(value),
      'Asia/Taipei',
      'yyyy/MM/dd HH:mm'
    );
  } catch (err) {
    return String(value);
  }
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
