// Google Apps Script for MerSearch Helper
// Replace the placeholder tokens below with the actual shared secrets.
const SECRET_TOKEN = 'cd3da0be-7860-4063-a3c5-5014b3a27056';
const ADMIN_TOKEN = '7763e9c9-554e-4deb-bd7a-2b3ebb2dc148';
const SHEET_NAME = 'Logs';

function doGet(e) {
  const params = e?.parameter || {};
  const mode = (params.mode || 'check').trim();
  if (mode === 'admin') {
    return handleAdmin(params);
  }
  return handleCheck(params);
}

function handleCheck(params) {
  const token = (params.token || '').trim();
  const props = PropertiesService.getScriptProperties();
  const activeFlag = props.getProperty('ACTIVE');
  const updatedAt = props.getProperty('ACTIVE_UPDATED_AT') || null;
  const active = activeFlag !== 'false';
  const tokenValid = token === SECRET_TOKEN && !!SECRET_TOKEN && SECRET_TOKEN !== 'REPLACE_WITH_EXTENSION_TOKEN';
  return json({
    ok: tokenValid && active,
    active,
    enabled: tokenValid && active,
    updatedAt,
  });
}

function handleAdmin(params) {
  const adminToken = (params.admin_token || '').trim();
  if (adminToken !== ADMIN_TOKEN || !ADMIN_TOKEN || ADMIN_TOKEN === 'REPLACE_WITH_ADMIN_TOKEN') {
    return json({ ok: false, error: 'auth' });
  }
  const action = (params.action || '').trim();
  const props = PropertiesService.getScriptProperties();
  if (action === 'enable') {
    props.setProperty('ACTIVE', 'true');
    props.setProperty('ACTIVE_UPDATED_AT', new Date().toISOString());
    return json({ ok: true, status: 'enabled' });
  }
  if (action === 'disable') {
    props.setProperty('ACTIVE', 'false');
    props.setProperty('ACTIVE_UPDATED_AT', new Date().toISOString());
    return json({ ok: true, status: 'disabled' });
  }
  const activeFlag = props.getProperty('ACTIVE') || 'false';
  return json({
    ok: true,
    status: activeFlag === 'true' ? 'enabled' : 'disabled',
    updatedAt: props.getProperty('ACTIVE_UPDATED_AT') || null,
  });
}

function doPost(e) {
  try {
    const payload = parseJson(e?.postData?.contents);
    const token = (payload.token || '').trim();
    if (token !== SECRET_TOKEN || !token) {
      return json({ ok: false, error: 'auth' }, 403);
    }
    const type = (payload.type || 'log-visit').trim();
    if (type === 'log-visit') {
      return handleLogVisit(payload.entry || {});
    }
    return json({ ok: false, error: 'unknown_type' }, 400);
  } catch (error) {
    return json({ ok: false, error: String(error) }, 500);
  }
}

function handleLogVisit(entry) {
  const normalized = normalizeLogEntry(entry);
  const sheet = ensureLogSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['LoggedAt', 'URL', 'PageType', 'ItemID', 'Title', 'Price', 'Currency', 'SoldAt', 'DocumentTitle', 'RawJson']);
  }
  sheet.appendRow([
    normalized.loggedAt,
    normalized.url,
    normalized.pageType,
    normalized.itemId,
    normalized.title,
    normalized.price,
    normalized.currency,
    normalized.soldAt,
    normalized.documentTitle,
    normalized.raw,
  ]);
  return json({ ok: true });
}

function normalizeLogEntry(entry) {
  const obj = entry || {};
  const loggedAt = (obj.loggedAt || '').trim();
  const price = obj.price != null && obj.price !== '' ? Number(obj.price) : '';
  return {
    loggedAt: loggedAt || new Date().toISOString(),
    url: (obj.url || '').toString(),
    pageType: (obj.pageType || '').toString(),
    itemId: (obj.itemId || '').toString(),
    title: (obj.title || '').toString(),
    price: Number.isFinite(price) ? price : '',
    currency: (obj.currency || '').toString(),
    soldAt: (obj.soldAt || '').toString(),
    documentTitle: (obj.documentTitle || '').toString(),
    raw: JSON.stringify(obj),
  };
}

function ensureLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function parseJson(source) {
  if (!source) return {};
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error('invalid_json');
  }
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
