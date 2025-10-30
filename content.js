// @ts-check

/** @typedef {import('./content-metrics.js')} MerHelperMetrics */
/** @typedef {typeof globalThis & { MerHelperMetrics?: MerHelperMetrics }} MerHelperGlobal */
/** @typedef {import('./tests/types/chrome').MerHelperKillSwitchStatus} MerHelperKillSwitchStatus */
/** @typedef {import('./tests/types/chrome').MerHelperLogEntry} MerHelperLogEntry */
/** @typedef {import('./tests/types/chrome').MerHelperPageType} MerHelperPageType */

/** @type {MerHelperGlobal} */
const merHelperContentGlobal = typeof self !== 'undefined'
  ? /** @type {any} */ (self)
  : /** @type {any} */ (globalThis);

(function () {
  /** @type {MerHelperMetrics | null} */
  const metrics = merHelperContentGlobal.MerHelperMetrics ||
    (typeof require === 'function' ? /** @type {MerHelperMetrics} */ (require('./content-metrics')) : null);
  if (!metrics) {
    throw new Error('MerHelperMetrics not available');
  }
  const { findPrice, findTitleKey, isSold } = metrics;

  const DEBUG = false;
  const VER = '6.0-dom-scrape-bg';
  try { console.debug('[MerSearch Helper] content.js loaded:', VER); } catch { }

  let killSwitchEnabled = false;
  let killSwitchReady = false;
  let overlayScheduled = false;

  // 取得設定
  const LIKE_FETCH_MAX = 24; // 1回の最大処理カード数
  const JITTER_MS = 120;
  const RETRY_SCHEDULE_MS = [3000, 12000]; // 3秒→12秒で再読
  const likeCache = new Map(); // href -> number|null

  // 検索結果のカード内「詳細ページへのリンク」
  const ITEM_SELECTORS = [
    'a[href^="/item/"]',
    'li a[href^="/item/"]',
    'a[href*="://jp.mercari.com/item/"]',
    'li a[href*="://jp.mercari.com/item/"]'
  ];

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const jitter = (base = 0) => base + Math.floor(Math.random() * JITTER_MS);

  function getLocationObject() {
    try {
      if (typeof location !== 'undefined') return location;
    } catch { }
    return null;
  }

  function getLocationHref() {
    const loc = getLocationObject();
    return loc ? (loc.href || '') : '';
  }

  function getLocationPathname() {
    const loc = getLocationObject();
    return loc ? (loc.pathname || '') : '';
  }

  async function waitForKillSwitchStatus({ attempts = 3, force = false } = {}) {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await chrome.runtime.sendMessage({ scope: 'mer-helper', type: 'getKillSwitchStatus', force });
        if (!res?.ok) {
          continue;
        }
        const result = res.result;
        if (result && typeof result === 'object' && 'enabled' in result) {
          const status = /** @type {MerHelperKillSwitchStatus} */ (result);
          return { enabled: Boolean(status.enabled), raw: status };
        }
      } catch (error) {
        if (DEBUG) console.debug('[MerSearch] kill switch request failed', error);
      }
      await sleep(250 * (i + 1));
    }
    return { enabled: false, raw: null };
  }

  function applyKillSwitchState(enabled) {
    const normalized = Boolean(enabled);
    const changed = normalized !== killSwitchEnabled || !killSwitchReady;
    killSwitchEnabled = normalized;
    killSwitchReady = true;
    if (changed) {
      if (killSwitchEnabled) {
        scheduleInitialOverlay();
        startTransactionLogger();
      } else {
        stopTransactionLogger();
      }
    }
  }

  function getItemsInView() {
    const set = new Set();
    ITEM_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(a => set.add(a)));
    return [...set].filter(a => /(?:^\/|:\/\/jp\.mercari\.com\/)item\//.test(a.getAttribute('href') || ''));
  }

  // ---- 背景へ「DOMスクレイプ」を依頼 ----
  async function fetchLikeByBgDomScrape(href) {
    if (!href) return null;
    if (likeCache.has(href)) return likeCache.get(href);

    let value = null;
    try {
      const r = await chrome.runtime.sendMessage({ scope: 'mer-helper', type: 'bgScrapeLike', url: new URL(href, location.origin).toString() });
      if (r?.ok && Number.isFinite(r.value)) value = r.value;
    } catch (e) {
      if (DEBUG) console.debug('[MerSearch] bgScrapeLike error', e);
    }
    likeCache.set(href, value);
    return value;
  }

  // ---- バッジ描画 ----
  function updateBadge(el, val) {
    const badge =
      el.querySelector('.mer-badge') ||
      (el.parentElement && el.parentElement.querySelector('.mer-badge'));
    if (badge) badge.textContent = `♥ ${val}`;
  }

  // ---- 再試行（描画遅延対策）----
  const recheckCounts = new Map(); // href -> count
  function scheduleRechecks(hostEl, href) {
    if (!href) return;
    recheckCounts.set(href, 0);

    const fire = (idx) => {
      setTimeout(async () => {
        const badge = hostEl.querySelector('.mer-badge') ||
          (hostEl.parentElement && hostEl.parentElement.querySelector('.mer-badge'));
        if (badge && /\d+/.test(badge.textContent || '')) return;

        const v = await fetchLikeByBgDomScrape(href);
        if (Number.isFinite(v)) { updateBadge(hostEl, v); return; }

        const cur = recheckCounts.get(href) || 0;
        if (cur === idx && idx + 1 < RETRY_SCHEDULE_MS.length) {
          recheckCounts.set(href, cur + 1);
          fire(idx + 1);
        }
      }, RETRY_SCHEDULE_MS[idx] + Math.floor(Math.random() * 500));
    };

    fire(0);
  }

  // ---- いいね補完（DOMスクレイプのみ）----
  let _hydrating = false;
  async function hydrateLikes(rows) {
    if (_hydrating) return;
    _hydrating = true;
    try {
      const targets = rows
        .filter(r => r.likes == null && r.el?.getAttribute('href'))
        .slice(0, LIKE_FETCH_MAX);

      // 逐次で十分（背景側でキュー制御）
      for (const r of targets) {
        try {
          await sleep(jitter(30));
          const href = r.el?.getAttribute('href');
          if (!href) continue;

          const val = await fetchLikeByBgDomScrape(href);
          if (Number.isFinite(val)) {
            r.likes = val;
            updateBadge(r.el, val);
          } else {
            scheduleRechecks(r.el, href);
          }
        } catch (e) {
          if (DEBUG) console.debug('[MerSearch] hydrate error', e);
        }
      }
    } finally {
      _hydrating = false;
    }
  }

  // ---- 自動スクロール ----
  const helpers = {
    async autoScrollAll(maxSteps = 40) {
      let last = 0;
      for (let i = 0; i < maxSteps; i++) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(600);
        const h = document.body.scrollHeight;
        if (h === last) break;
        last = h;
      }
      window.scrollTo({ top: document.body.scrollHeight });
      await sleep(300);
    }
  };

  // ---- オーバーレイ ----
  function overlayBox() {
    let box = document.getElementById('mer-helper-overlay');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'mer-helper-overlay';
    box.innerHTML = `
      <div class="mh-title">MerSearch Helper</div>
      <div class="mh-body"><span>準備中…</span></div>
    `;
    document.body.appendChild(box);
    return box;
  }
  function updateOverlay(data) {
    const box = overlayBox();
    const yen = n => n == null ? '-' : ('¥' + n.toLocaleString());
    box.querySelector('.mh-body').innerHTML = `
      <div>出品中：<b>${data.activeCount}</b></div>
      <div>売り切れ：<b>${data.soldCount}</b></div>
      <div>レンジ${data.soldOnly ? '(SOLD)' : '(全件)'}：<b>${yen(data.minPrice)}〜${data.maxPrice == null ? '-' : yen(data.maxPrice)}</b></div>
      <div style="font-size:12px;opacity:.7">取得：${data.totalParsed}件</div>
    `;
  }
  function toggleOverlay() {
    const el = overlayBox();
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
  }

  // ---- 集計 & バッジ初期描画 ----
  function aggregate({ soldOnly = false, showBadges = true } = {}) {
    const rows = getItemsInView().map((el) => ({
      el,
      price: findPrice(el),
      titleKey: findTitleKey(el),
      likes: null,
      soldFlag: isSold(el)
    }));

    let active = 0;
    let sold = 0;
    let minPrice = null;
    let maxPrice = null;
    let totalParsed = 0;
    for (const r of rows) {
      if (r.soldFlag) sold++; else active++;
      const include = soldOnly ? r.soldFlag : true;
      if (include && r.price != null) {
        minPrice = (minPrice == null) ? r.price : Math.min(minPrice, r.price);
        maxPrice = (maxPrice == null) ? r.price : Math.max(maxPrice, r.price);
      }
      totalParsed++;
    }

    if (showBadges) {
      for (const r of rows) {
        try {
          const host = r.el;
          host.classList.add('mer-rel');
          let badge = host.querySelector('.mer-badge');
          if (!badge) {
            badge = document.createElement('div');
            badge.className = 'mer-badge';
            host.appendChild(badge);
          }
          badge.textContent = '♥ -';
        } catch { }
      }
    }

    if (showBadges) {
      setTimeout(() => {
        try { hydrateLikes(rows); } catch { }
      }, 0);
    }

    return { activeCount: active, soldCount: sold, minPrice, maxPrice, totalParsed, soldOnly };
  }

  const LOG_DEBOUNCE_MS = 1500;
  const LOG_INTERVAL_MS = 5000;
  let logTimer = null;
  let logIntervalId = null;
  let logObserver = null;
  let lastLoggedSignature = null;
  let lastObservedHref = getLocationHref();

  /**
   * @param {string} pathname
   * @returns {MerHelperPageType | null}
   */
  function detectLogPageType(pathname) {
    if (!pathname) return null;
    if (/^\/mypage\/sold/.test(pathname)) return 'mypage-sold';
    if (/^\/transaction\//.test(pathname)) return 'transaction-detail';
    if (/^\/mypage\/transaction/.test(pathname)) return 'mypage-transaction';
    return null;
  }

  function shouldLogCurrentPage() {
    try {
      return detectLogPageType(getLocationPathname()) != null;
    } catch {
      return false;
    }
  }

  function readFirstText(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        const text = el?.textContent?.trim();
        if (text) return text;
      } catch { }
    }
    return '';
  }

  function extractItemId() {
    const candidates = [getLocationHref(), getLocationPathname()];
    const anchor = document.querySelector('a[href*="/item/"]');
    if (anchor) candidates.push(anchor.getAttribute('href') || '');
    for (const value of candidates) {
      const match = value && value.match(/m[0-9A-Za-z]+/);
      if (match) return match[0];
    }
    return null;
  }

  function extractPriceCandidate() {
    const selectors = [
      '[data-testid="transaction-price"]',
      '[data-testid="price-box"]',
      '[data-testid="item-price"]',
      '.transaction-price',
      '.merPrice',
      '.price',
      'meta[itemprop="price"]'
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const value = metrics.findPrice(/** @type {HTMLElement} */(el));
        if (Number.isFinite(value)) return value;
      } catch { }
    }
    try {
      const fallback = metrics.findPrice(/** @type {HTMLElement} */(document.body));
      if (Number.isFinite(fallback)) return fallback;
    } catch { }
    return null;
  }

  function normalizeDateText(value = '') {
    return value
      .replace(/[年月]/g, '/')
      .replace(/[.]/g, '/')
      .replace(/日/g, '')
      .replace(/：/g, ':')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractSoldAtCandidate() {
    const timeElements = Array.from(document.querySelectorAll('time'));
    for (const el of timeElements) {
      const label = (el.parentElement?.textContent || '').trim();
      if (/取引|発送|完了|受取|購入|支払|日時|落札|売上/i.test(label)) {
        const value = el.getAttribute('datetime') || el.textContent || '';
        const normalized = normalizeDateText(value);
        if (normalized) return normalized;
      }
    }
    const text = (document.body?.innerText || '').slice(0, 2000);
    const pattern = /(20\d{2})[/.年-]?\s*(\d{1,2})[/.月-]?\s*(\d{1,2})(?:\s*(\d{1,2}[:：]\d{2}))?/;
    const match = text.match(pattern);
    if (match) {
      const [, y, m, d, hm] = match;
      return normalizeDateText(`${y}/${m}/${d}${hm ? ' ' + hm.replace('：', ':') : ''}`);
    }
    return null;
  }

  /** @returns {MerHelperLogEntry | null} */
  function collectTransactionLogData() {
    const pageType = detectLogPageType(getLocationPathname());
    if (!pageType) return null;
    const entry = /** @type {MerHelperLogEntry} */ ({ url: getLocationHref(), pageType });
    const itemId = extractItemId();
    if (itemId) entry.itemId = itemId;
    const title = readFirstText([
      '[data-testid="item-name"]',
      '[data-testid="transaction-item-name"]',
      'h1',
      'h2',
      '.mer-item-name'
    ]) || (document.title || '').trim();
    if (title) entry.title = title;
    const price = extractPriceCandidate();
    if (Number.isFinite(price)) {
      entry.price = price;
      entry.currency = 'JPY';
    }
    const soldAt = extractSoldAtCandidate();
    if (soldAt) entry.soldAt = soldAt;
    const docTitle = (document.title || '').trim();
    if (docTitle) entry.documentTitle = docTitle;
    return entry;
  }

  async function flushTransactionLog() {
    const entry = collectTransactionLogData();
    if (!entry) return;
    const signature = JSON.stringify([entry.url, entry.itemId || '', entry.soldAt || '', entry.price ?? '']);
    if (signature && signature === lastLoggedSignature) return;
    lastLoggedSignature = signature;
    try {
      const res = await chrome.runtime.sendMessage({ scope: 'mer-helper', type: 'logPageVisit', entry });
      if (DEBUG) console.debug('[MerSearch] logPageVisit result', res);
    } catch (error) {
      if (DEBUG) console.debug('[MerSearch] logPageVisit failed', error);
    }
  }

  function scheduleTransactionLogEvaluation(delayMs = LOG_DEBOUNCE_MS) {
    if (!killSwitchEnabled || !shouldLogCurrentPage()) return;
    if (logTimer) clearTimeout(logTimer);
    logTimer = setTimeout(() => {
      logTimer = null;
      if (!killSwitchEnabled || !shouldLogCurrentPage()) return;
      flushTransactionLog();
    }, delayMs);
  }

  function startTransactionLogger() {
    if (logIntervalId != null) {
      scheduleTransactionLogEvaluation();
      return;
    }
    lastObservedHref = getLocationHref();
    scheduleTransactionLogEvaluation(800);
    if (typeof MutationObserver === 'function') {
      const target = document.body || document.documentElement;
      if (target) {
        logObserver = new MutationObserver(() => scheduleTransactionLogEvaluation());
        logObserver.observe(target, { childList: true, subtree: true });
      }
    }
    logIntervalId = setInterval(() => {
      if (!killSwitchEnabled) return;
      const currentHref = getLocationHref();
      if (currentHref !== lastObservedHref) {
        lastObservedHref = currentHref;
        lastLoggedSignature = null;
        scheduleTransactionLogEvaluation(500);
        return;
      }
      scheduleTransactionLogEvaluation();
    }, LOG_INTERVAL_MS);
  }

  function stopTransactionLogger() {
    if (logTimer) { clearTimeout(logTimer); logTimer = null; }
    if (logIntervalId != null) { clearInterval(logIntervalId); logIntervalId = null; }
    if (logObserver) { logObserver.disconnect(); logObserver = null; }
    lastLoggedSignature = null;
  }

  // ---- エントリ ----
  async function scan({ mode = 'view', soldOnly = false, showBadges = true } = {}) {
    if (mode === 'all') await helpers.autoScrollAll();
    const res = aggregate({ soldOnly, showBadges });
    updateOverlay(res);
    return res;
  }

  function scheduleInitialOverlay() {
    if (overlayScheduled) return;
    overlayScheduled = true;
    setTimeout(() => {
      try {
        const res = aggregate({ soldOnly: false, showBadges: true });
        updateOverlay(res);
      } catch (error) {
        if (DEBUG) console.debug('[MerSearch] initial overlay failed', error);
      }
    }, 1200);
  }

  // メッセージ
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.scope !== 'mer-helper') return;
    (async () => {
      try {
        if (msg.type === 'ping') { sendResponse({ ok: true, result: 'pong' }); return; }
        if (!killSwitchReady) {
          const status = await waitForKillSwitchStatus({ attempts: 1 });
          applyKillSwitchState(status.enabled);
        }
        if (!killSwitchEnabled) {
          sendResponse({ ok: false, disabled: true });
          return;
        }
        if (msg.type === 'toggleOverlay') { toggleOverlay(); sendResponse({ ok: true, result: true }); return; }
        if (msg.type === 'scan') { const r = await scan(msg.payload || {}); sendResponse({ ok: true, result: r }); return; }
        sendResponse({ ok: false, error: 'unknown type' });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  });

  async function bootstrapKillSwitch() {
    const status = await waitForKillSwitchStatus({ attempts: 3, force: false });
    applyKillSwitchState(status.enabled);
  }

  bootstrapKillSwitch().catch((error) => {
    if (DEBUG) console.debug('[MerSearch] bootstrap kill switch failed', error);
  });

  setInterval(() => {
    waitForKillSwitchStatus({ attempts: 1 })
      .then((status) => applyKillSwitchState(status.enabled))
      .catch((error) => { if (DEBUG) console.debug('[MerSearch] kill switch poll error', error); });
  }, 60_000);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { aggregate, scan, __private: helpers };
  }
})();
