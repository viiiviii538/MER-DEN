// @ts-check

/**
 * @typedef {{
 *   findPrice: (el: HTMLElement | null | undefined) => number | null,
 *   findTitleKey: (el: HTMLElement | null | undefined) => string,
 *   isSold: (el: HTMLElement | null | undefined) => boolean,
 *   _internals: {
 *     normaliseWhitespace: (value?: string | null) => string,
 *     PRICE_PATTERN: RegExp,
 *     PRICE_FALLBACK_PATTERN: RegExp,
 *     SOLD_ALT_SELECTOR: string,
 *     collectText: (el: HTMLElement | null | undefined) => string
 *   }
 * }} MerHelperMetrics
 */

/**
 * @typedef {typeof globalThis & { MerHelperMetrics?: MerHelperMetrics }} MerHelperGlobal
 */

/** @type {MerHelperGlobal} */
const merHelperMetricsGlobal = typeof self !== 'undefined' ? /** @type {any} */ (self) : /** @type {any} */ (globalThis);

/** @type {MerHelperMetrics} */
const metrics = createMetrics();

if (typeof module === 'object' && module.exports) {
  module.exports = metrics;
} else {
  merHelperMetricsGlobal.MerHelperMetrics = metrics;
}

/**
 * @returns {MerHelperMetrics}
 */
function createMetrics() {
  const PRICE_PATTERN = /[¥￥]\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)/;
  const PRICE_FALLBACK_PATTERN = /([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\s*円/;
  const SOLD_TEXT_PATTERN = /sold|売り切れ/i;
  const SOLD_ALT_SELECTOR = '[aria-label*="SOLD"],[alt*="SOLD"],[aria-label*="売り切れ"],[alt*="売り切れ"]';

  /**
   * @param {string | null | undefined} [value]
   * @returns {string}
   */
  function normaliseWhitespace(value = '') {
    return String(value).replace(/\s+/g, ' ');
  }

  /**
   * @param {HTMLElement | null | undefined} el
   * @returns {string}
   */
  function collectText(el) {
    if (!el) return '';
    /** @type {Set<string>} */
    const values = new Set();
    /**
     * @param {unknown} value
     */
    const push = (value) => {
      if (value == null) return;
      const str = normaliseWhitespace(/** @type {string} */ (value));
      if (str) values.add(str);
    };

    push(/** @type {unknown} */ (el.innerText));
    push(/** @type {unknown} */ (el.textContent));

    if (typeof el.getAttribute === 'function') {
      push(el.getAttribute('aria-label'));
      push(el.getAttribute('data-price'));
      push(el.getAttribute('content'));
    }

    if (el.dataset && typeof el.dataset === 'object') {
      push(el.dataset.price);
    }

    return Array.from(values).join(' ');
  }

  /**
   * @param {HTMLElement | null | undefined} el
   * @returns {number | null}
   */
  function findPrice(el) {
    const text = collectText(el);
    const primary = text.match(PRICE_PATTERN);
    const fallback = primary || text.match(PRICE_FALLBACK_PATTERN);
    if (fallback) {
      return Number(fallback[1].replace(/,/g, ''));
    }

    /**
     * @param {unknown} value
     * @returns {number | null}
     */
    const parseNumericAttribute = (value) => {
      if (value == null) return null;
      const cleaned = String(value).trim().replace(/,/g, '');
      if (!cleaned) return null;
      return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
    };

    /** @type {Array<string | null | undefined>} */
    const candidates = [];
    if (typeof el?.getAttribute === 'function') {
      candidates.push(el.getAttribute('data-price'));
      candidates.push(el.getAttribute('content'));
    }

    if (el?.dataset && typeof el.dataset === 'object') {
      candidates.push(el.dataset.price);
    }

    for (const value of candidates) {
      const numeric = parseNumericAttribute(value);
      if (numeric != null) return numeric;
    }

    return null;
  }

  /**
   * @param {HTMLElement | null | undefined} el
   * @returns {string}
   */
  function findTitleKey(el) {
    const raw = el?.getAttribute?.('title') || el?.innerText || el?.textContent || '';
    return normaliseWhitespace(raw)
      .replace(/[[\]【】()（）]/g, ' ')
      .replace(/[~〜\-_:：|｜]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim()
      .toLowerCase();
  }

  /**
   * @param {HTMLElement | null | undefined} el
   * @returns {boolean}
   */
  function isSold(el) {
    const base = normaliseWhitespace((el?.innerText || el?.textContent || '') + (el?.getAttribute?.('aria-label') || ''));
    if (SOLD_TEXT_PATTERN.test(base)) return true;
    const query = el?.querySelector?.bind(el);
    return typeof query === 'function' && Boolean(query(SOLD_ALT_SELECTOR));
  }

  /** @type {MerHelperMetrics} */
  const api = {
    findPrice,
    findTitleKey,
    isSold,
    _internals: {
      normaliseWhitespace,
      PRICE_PATTERN,
      PRICE_FALLBACK_PATTERN,
      SOLD_ALT_SELECTOR,
      collectText
    }
  };

  return api;
}
