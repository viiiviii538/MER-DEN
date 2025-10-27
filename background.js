// @ts-check
// MerSearch Helper - background (MV3)
// 検索結果の各商品URLを不可視タブで開き、詳細ページの実DOMから♥数を抽出する。

const DEBUG = false;

// -------- GAS連携設定 --------
// TODO: 実運用では endpoint/token を自身の GAS Web アプリの値に差し替える
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzYBkHGH5DE4AiRw66z1zqlcpMKibl7VxJtxvpuHL1ETnp8xpgZP7oPzSBhnjEugYz3/exec';
const GAS_SECRET_TOKEN = 'cd3da0be-7860-4063-a3c5-5014b3a27056';
const GAS_FETCH_TIMEOUT_MS = 8000;

const KILL_SWITCH_REFRESH_MINUTES = 5;
const KILL_SWITCH_CACHE_MS = 60_000; // 直近値は1分キャッシュ
const KILL_SWITCH_STORAGE_KEY = 'merHelper.killSwitch';
const MAX_CONSECUTIVE_KILL_SWITCH_FAILURE = 3;

const PAGE_LOG_DEDUP_MS = 10 * 60_000; // 10分以内は同一データ重複送信しない

/** @type {{
 *   enabled: boolean;
 *   lastChecked: number;
 *   lastSuccess: number;
 *   consecutiveFailures: number;
 *   pending: Promise<any> | null;
 * }}
 */
const killSwitchState = {
    enabled: true,
    lastChecked: 0,
    lastSuccess: 0,
    consecutiveFailures: 0,
    pending: null,
};

/** @type {Map<string, number>} */
const recentLogCache = new Map();

// 1回のスキャンで処理する最大件数（安全上限）
const MAX_ITEMS_PER_RUN = 30;
let processedThisRun = 0;

// -------- キュー（同時1タスク・安全実装） --------
const queueState = {
    items: [],
    running: false
};

async function pump() {
    if (queueState.running) return;
    const next = queueState.items.shift();
    if (!next) return;
    queueState.running = true;
    try {
        const val = await next.task();
        next.resolve(val);
    } catch (e) {
        next.resolve(null);
    } finally {
        queueState.running = false;
        if (queueState.items.length) pump();
    }
}

function realEnqueue(task) {
    return new Promise((resolve) => {
        queueState.items.push({ task, resolve });
        pump();
    });
}

let enqueueImpl = realEnqueue;

function enqueue(task) {
    return enqueueImpl(task);
}

function __resetQueue() {
    queueState.items.length = 0;
    queueState.running = false;
}

function __setEnqueueImplementation(fn) {
    enqueueImpl = (typeof fn === 'function') ? fn : realEnqueue;
}

// -------- タブ読み込み待ち（status:complete まで） --------
function waitTabComplete(tabId, timeoutMs = 15000) {
    return new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            try { chrome.tabs.onUpdated.removeListener(listener); } catch { }
            resolve(false);
        }, timeoutMs);

        const listener = (id, info) => {
            if (id !== tabId) return;
            if (info.status === 'complete') {
                if (done) return;
                done = true;
                clearTimeout(timer);
                try { chrome.tabs.onUpdated.removeListener(listener); } catch { }
                resolve(true);
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}

// -------- 詳細ページDOMから♥数を抽出 --------
async function scrapeLikeFromDomOnce(url) {
    // 非アクティブタブで開く（ユーザーにフォーカスを奪わない）
    const tab = await chrome.tabs.create({ url, active: false });
    try {
        const ok = await waitTabComplete(tab.id, 20000);
        if (!ok) throw new Error('tab timeout');

        const [ret] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: async () => {
                // いいね数抽出（div[data-testid]配下のbutton直下span.merTextを最優先）
                const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                const read = () => {
                    const root =
                        document.querySelector('[data-testid="icon-heart-button"]') ||
                        document.querySelector('button[aria-label*="いいね"], button[aria-label*="Like"]');

                    if (!root) return null;

                    // 1) UI表示の数値（span.merText）
                    const span =
                        root.querySelector('span.merText, span[class*="merText"]') ||
                        root.querySelector('button span.merText, button span[class*="merText"]');
                    if (span) {
                        const n = parseInt(span.textContent.trim(), 10);
                        if (Number.isFinite(n) && n >= 0 && n <= 99999) return n;
                    }

                    // 2) フォールバック：button の aria-label / text
                    const btn =
                        (root.tagName === 'BUTTON' ? root : root.querySelector('button')) ||
                        document.querySelector('button[aria-label*="いいね"], button[aria-label*="Like"]');
                    if (btn) {
                        const t = (btn.getAttribute('aria-label') || btn.textContent || '').trim();
                        const m = t.match(/\b(\d{1,5})\b/);
                        if (m) return +m[1];
                    }
                    return null;
                };

                // 遅延描画対策：スクロール＋リトライ
                let picked = null;
                for (let i = 0; i < 8; i++) {
                    // ブロック/検証画面検知
                    const blocked =
                        !!document.querySelector('iframe[src*="recaptcha"]') ||
                        /verify|recaptcha/i.test(document.body.innerText || '');
                    if (blocked) return { picked: null, blocked: true };
                    if (i === 0) {
                        window.scrollTo(0, Math.min(600, document.body.scrollHeight / 3));
                        await sleep(160);
                        window.scrollTo(0, 0);
                    } else {
                        await sleep(220 * Math.pow(1.25, i)); // 緩い指数バックオフ
                    }
                    picked = read();
                    if (Number.isFinite(picked)) break;
                }
                return { picked };
            }
        });
        const diag = ret?.result || { picked: null };
        if (DEBUG) console.debug('[bg] like-diag', url, diag);
        return Number.isFinite(diag.picked) ? diag.picked : null;
    } catch (e) {
        if (DEBUG) console.debug('[bg] scrape error', url, e);
        return null;
    } finally {
        if (tab?.id) {
            try { await chrome.tabs.remove(tab.id); } catch { }
        }
    }
}

// -------- 2ドメイン候補（jp→www）の順で試行 --------
async function scrapeLike(url) {
    if (processedThisRun >= MAX_ITEMS_PER_RUN) return null;
    const u = new URL(url);
    const id = u.pathname.match(/\/(item|items)\/(m[0-9A-Za-z]+)/)?.[2];
    const candidates = id
        ? [
            `https://jp.mercari.com/item/${id}`,
            `https://www.mercari.com/jp/items/${id}/`
        ]
        : [url];

    for (const c of candidates) {
        const v = await scrapeLikeFromDomOnce(c);
        if (Number.isFinite(v)) {
            processedThisRun++;
            return v;
        }
    }
    return null;
}

function __getProcessedThisRun() {
    return processedThisRun;
}

function __setProcessedThisRun(val) {
    processedThisRun = val;
}

function __getMaxItemsPerRun() {
    return MAX_ITEMS_PER_RUN;
}

// -------- Kill Switch 管理 --------

function getNow() {
    return Date.now();
}

function withTimeout(promise, ms) {
    if (!Number.isFinite(ms) || ms <= 0) return promise;
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
}

async function readKillSwitchCache() {
    if (!chrome?.storage?.local?.get) return null;
    try {
        const data = await chrome.storage.local.get(KILL_SWITCH_STORAGE_KEY);
        const value = data?.[KILL_SWITCH_STORAGE_KEY];
        if (value && typeof value === 'object') {
            return {
                enabled: Boolean(value.enabled),
                lastChecked: Number(value.lastChecked) || 0,
                lastSuccess: Number(value.lastSuccess) || 0,
            };
        }
    } catch (e) {
        if (DEBUG) console.debug('[bg] readKillSwitchCache error', e);
    }
    return null;
}

async function writeKillSwitchCache(enabled) {
    if (!chrome?.storage?.local?.set) return;
    try {
        await chrome.storage.local.set({
            [KILL_SWITCH_STORAGE_KEY]: {
                enabled,
                lastChecked: killSwitchState.lastChecked,
                lastSuccess: killSwitchState.lastSuccess,
            },
        });
    } catch (e) {
        if (DEBUG) console.debug('[bg] writeKillSwitchCache error', e);
    }
}

function updateKillSwitchState({ enabled, ok }) {
    const now = getNow();
    killSwitchState.lastChecked = now;
    if (ok) {
        killSwitchState.enabled = enabled;
        killSwitchState.lastSuccess = now;
        killSwitchState.consecutiveFailures = 0;
        writeKillSwitchCache(enabled);
    } else {
        killSwitchState.consecutiveFailures += 1;
        if (killSwitchState.consecutiveFailures >= MAX_CONSECUTIVE_KILL_SWITCH_FAILURE) {
            killSwitchState.enabled = false;
        }
    }
    return {
        enabled: killSwitchState.enabled,
        lastChecked: killSwitchState.lastChecked,
        lastSuccess: killSwitchState.lastSuccess,
        source: ok ? 'remote' : 'error',
    };
}

async function fetchKillSwitchFromRemote() {
    if (!GAS_ENDPOINT || !GAS_SECRET_TOKEN || /DEPLOYMENT_ID|REPLACE_WITH_SECRET_TOKEN/.test(GAS_ENDPOINT + GAS_SECRET_TOKEN)) {
        // 設定されていない場合は常時ON扱い（リモート制御なし）
        return updateKillSwitchState({ enabled: true, ok: true });
    }
    if (typeof fetch !== 'function') {
        return updateKillSwitchState({ enabled: killSwitchState.enabled, ok: false });
    }
    const url = new URL(GAS_ENDPOINT);
    url.searchParams.set('mode', 'check');
    url.searchParams.set('token', GAS_SECRET_TOKEN);
    try {
        const res = await withTimeout(fetch(url.toString(), { method: 'GET', cache: 'no-store' }), GAS_FETCH_TIMEOUT_MS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        const enabled = Boolean(data?.active ?? data?.enabled ?? data?.ok);
        return updateKillSwitchState({ enabled, ok: true });
    } catch (error) {
        if (DEBUG) console.debug('[bg] kill switch fetch failed', error);
        return updateKillSwitchState({ enabled: killSwitchState.enabled, ok: false });
    }
}

async function ensureKillSwitchFresh({ force = false } = {}) {
    const now = getNow();
    if (!force && now - killSwitchState.lastChecked <= KILL_SWITCH_CACHE_MS) {
        return {
            enabled: killSwitchState.enabled,
            lastChecked: killSwitchState.lastChecked,
            lastSuccess: killSwitchState.lastSuccess,
            source: 'memory',
        };
    }
    if (!killSwitchState.pending) {
        killSwitchState.pending = (async () => {
            if (now - killSwitchState.lastSuccess > KILL_SWITCH_CACHE_MS) {
                return fetchKillSwitchFromRemote();
            }
            return updateKillSwitchState({ enabled: killSwitchState.enabled, ok: true });
        })().finally(() => {
            killSwitchState.pending = null;
        });
    }
    try {
        return await killSwitchState.pending;
    } catch (error) {
        if (DEBUG) console.debug('[bg] ensureKillSwitchFresh error', error);
        return {
            enabled: killSwitchState.enabled,
            lastChecked: killSwitchState.lastChecked,
            lastSuccess: killSwitchState.lastSuccess,
            source: 'error',
        };
    }
}

async function initKillSwitchState() {
    const cached = await readKillSwitchCache();
    if (cached) {
        killSwitchState.enabled = Boolean(cached.enabled);
        killSwitchState.lastChecked = Number(cached.lastChecked) || 0;
        killSwitchState.lastSuccess = Number(cached.lastSuccess) || 0;
    }
    ensureKillSwitchFresh({ force: true }).catch(() => { /* noop */ });
}

function scheduleKillSwitchRefresh() {
    if (!chrome?.alarms?.create || !chrome?.alarms?.onAlarm?.addListener) return;
    try {
        chrome.alarms.create('merHelper.killSwitchRefresh', {
            periodInMinutes: Math.max(1, KILL_SWITCH_REFRESH_MINUTES),
            delayInMinutes: 0.2,
        });
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm?.name === 'merHelper.killSwitchRefresh') {
                ensureKillSwitchFresh({ force: true }).catch(() => { /* noop */ });
            }
        });
    } catch (e) {
        if (DEBUG) console.debug('[bg] scheduleKillSwitchRefresh error', e);
    }
}

initKillSwitchState();
scheduleKillSwitchRefresh();

async function ensureKillSwitchEnabled() {
    const status = await ensureKillSwitchFresh();
    return Boolean(status?.enabled);
}

// -------- GAS ログ送信 --------

function makeLogSignature(entry) {
    const parts = [entry?.url, entry?.itemId, entry?.soldAt, entry?.price];
    return parts.map((v) => (v == null ? '' : String(v))).join('|');
}

function pruneRecentLogCache(now = getNow()) {
    for (const [key, ts] of Array.from(recentLogCache.entries())) {
        if (now - ts > PAGE_LOG_DEDUP_MS) {
            recentLogCache.delete(key);
        }
    }
}

async function postVisitLog(entry) {
    if (!entry || typeof entry !== 'object') throw new Error('invalid_entry');
    if (!GAS_ENDPOINT || !GAS_SECRET_TOKEN || /DEPLOYMENT_ID|REPLACE_WITH_SECRET_TOKEN/.test(GAS_ENDPOINT + GAS_SECRET_TOKEN)) {
        throw new Error('gas_not_configured');
    }
    if (typeof fetch !== 'function') throw new Error('fetch_unavailable');
    const payload = {
        token: GAS_SECRET_TOKEN,
        type: 'log-visit',
        entry: {
            ...entry,
            loggedAt: entry.loggedAt || new Date().toISOString(),
        },
    };
    const res = await withTimeout(fetch(GAS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }), GAS_FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    if (data?.ok === false) {
        throw new Error(data?.error || 'log_failed');
    }
    return data;
}

async function handleLogPageVisit(entry) {
    const enabled = await ensureKillSwitchEnabled();
    if (!enabled) {
        return { ok: false, disabled: true };
    }
    const signature = makeLogSignature(entry);
    const now = getNow();
    pruneRecentLogCache(now);
    if (signature && recentLogCache.has(signature)) {
        return { ok: true, deduped: true };
    }
    try {
        await postVisitLog(entry);
        if (signature) recentLogCache.set(signature, now);
        return { ok: true };
    } catch (error) {
        if (DEBUG) console.debug('[bg] logPageVisit failed', error);
        return { ok: false, error: String(error) };
    }
}

// -------- メッセージ入口 --------
function handleRuntimeMessage(msg, _sender, sendResponse) {
    if (!msg || msg.scope !== 'mer-helper') return;
    (async () => {
        try {
            if (msg.type === 'bgScrapeLike' && typeof msg.url === 'string') {
                const enabled = await ensureKillSwitchEnabled();
                if (!enabled) {
                    sendResponse({ ok: false, disabled: true });
                    return;
                }
                const val = await enqueue(() => scrapeLike(msg.url));
                sendResponse({ ok: true, value: val });
            }
            if (msg.type === 'getKillSwitchStatus') {
                const status = await ensureKillSwitchFresh({ force: Boolean(msg.force) });
                sendResponse({ ok: true, result: status });
                return;
            }
            if (msg.type === 'logPageVisit' && msg.entry) {
                const result = await handleLogPageVisit(msg.entry);
                sendResponse(result);
                return;
            }
            sendResponse({ ok: false, error: 'unknown_type' });
        } catch (e) {
            sendResponse({ ok: false, error: String(e) });
        }
    })();
    return true;
}

chrome.runtime.onMessage.addListener(handleRuntimeMessage);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        enqueue,
        handleRuntimeMessage,
        waitTabComplete,
        scrapeLike,
        __resetQueue,
        __setEnqueueImplementation,
        __getProcessedThisRun,
        __setProcessedThisRun,
        __getMaxItemsPerRun,
        __setKillSwitchForTests(enabled) {
            killSwitchState.enabled = Boolean(enabled);
            killSwitchState.lastChecked = Date.now();
            killSwitchState.lastSuccess = killSwitchState.enabled ? killSwitchState.lastChecked : 0;
            killSwitchState.consecutiveFailures = 0;
        },
        __getKillSwitchState() {
            return { ...killSwitchState };
        },
        __clearRecentLogCache() {
            recentLogCache.clear();
        },
    };
}
