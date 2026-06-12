const SHEET_ID = '請填入你的 Google Sheet ID';
const PRODUCTS_SHEET = 'Products';
const ORDERS_SHEET = 'Orders';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'products') return jsonOutput({ ok: true, products: getProducts_() });
  return jsonOutput({ ok: false, message: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'createOrder') return jsonOutput(createOrder_(body));
    return jsonOutput({ ok: false, message: 'Unknown action' });
  } catch (err) {
    return jsonOutput({ ok: false, message: err.message });
  }
}

function getProducts_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(PRODUCTS_SHEET);
  if (!sheet) throw new Error('找不到 Products 工作表');
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.join('')).map(row => {
    const item = {};
    headers.forEach((h, i) => item[h] = row[i]);
    return item;
  });
}

function createOrder_(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(ORDERS_SHEET);
  if (!sheet) sheet = ss.insertSheet(ORDERS_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['createdAt', 'orderId', 'lineUserId', 'lineName', 'name', 'phone', 'address', 'itemsJson', 'total', 'status']);
  }

  const orderId = 'SHD' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + Math.floor(Math.random() * 1000);
  const customer = body.customer || {};
  const line = body.line || {};
  const items = body.items || [];
  const total = Number(body.total || 0);

  if (!customer.name || !customer.phone || !customer.address) throw new Error('姓名、電話、地址不可空白');
  if (!items.length) throw new Error('訂單沒有商品');

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
    '新訂單'
  ]);

  return { ok: true, orderId };
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
