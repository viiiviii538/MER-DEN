/**
 * @jest-environment jsdom
 */

const { createChromeMock } = require('./chrome-mock');

const createMetricsMock = () => ({
  findPrice: jest.fn((el) => {
    if (!el) return null;
    if (el.dataset && el.dataset.price) return Number(el.dataset.price);
    const text = el.textContent || '';
    const match = text.match(/\d+/);
    return match ? Number(match[0]) : null;
  }),
  findTitleKey: jest.fn((el) => el.dataset.title),
  isSold: jest.fn((el) => el.classList.contains('sold'))
});

async function flushTimers(iterations = 8) {
  for (let i = 0; i < iterations; i++) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
}

describe('content.js', () => {
  let chromeMock;
  let logEntries;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    chromeMock = createChromeMock();
    logEntries = [];
    chromeMock.chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message?.type === 'bgScrapeLike') {
        const url = message.url || '';
        if (url.includes('/item/1')) return Promise.resolve({ ok: true, value: 5 });
        if (url.includes('/item/2')) return Promise.resolve({ ok: true, value: 8 });
        return Promise.resolve({ ok: false });
      }
      if (message?.type === 'getKillSwitchStatus') {
        return Promise.resolve({ ok: true, result: { enabled: true } });
      }
      if (message?.type === 'logPageVisit') {
        logEntries.push(message.entry);
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false });
    });
    document.body.innerHTML = `
      <div class="results">
        <a class="card" href="/item/1" data-price="100" data-title="alpha"></a>
        <a class="card sold" href="/item/2" data-price="200" data-title="bravo"></a>
      </div>
    `;
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    const randomFn = /** @type {{ mockRestore?: () => void }} */ (Math.random);
    if (randomFn.mockRestore) randomFn.mockRestore();
    delete global.chrome;
  });

  test('aggregate calculates metrics and hydrates badge values', async () => {
    jest.doMock('../content-metrics', () => createMetricsMock());
    const { aggregate } = require('../content.js');

    const result = aggregate({ soldOnly: false, showBadges: true });

    expect(result).toEqual({
      activeCount: 1,
      soldCount: 1,
      minPrice: 100,
      maxPrice: 200,
      totalParsed: 2,
      soldOnly: false
    });

    const initialBadges = Array.from(document.querySelectorAll('.mer-badge')).map((el) => el.textContent);
    expect(initialBadges).toEqual(['♥ -', '♥ -']);

    await flushTimers();

    const likeCalls = chromeMock.chrome.runtime.sendMessage.mock.calls.filter(([msg]) => msg?.type === 'bgScrapeLike');
    expect(likeCalls).toHaveLength(2);
    const hydratedBadges = Array.from(document.querySelectorAll('.mer-badge')).map((el) => el.textContent);
    expect(hydratedBadges).toEqual(['♥ 5', '♥ 8']);
  });

  test('runtime listener triggers scan and responds with aggregated data', async () => {
    jest.doMock('../content-metrics', () => createMetricsMock());
    require('../content.js');

    const listener = chromeMock.runtimeOnMessage.getListeners()[0];
    expect(listener).toBeInstanceOf(Function);

    const sendResponse = jest.fn();
    const handled = listener({ scope: 'mer-helper', type: 'scan', payload: { soldOnly: true } }, {}, sendResponse);

    expect(handled).toBe(true);

    await flushTimers();

    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      result: expect.objectContaining({
        activeCount: 1,
        soldCount: 1,
        soldOnly: true
      })
    }));

    const overlay = document.getElementById('mer-helper-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('MerSearch Helper');
  });

  test('scan mode "all" triggers auto scroll once and updates overlay', async () => {
    jest.doMock('../content-metrics', () => createMetricsMock());
    const mod = require('../content.js');
    const scrollSpy = jest.spyOn(mod.__private, 'autoScrollAll').mockResolvedValue();

    const result = await mod.scan({ mode: 'all', soldOnly: false, showBadges: true });

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      activeCount: 1,
      soldCount: 1,
      minPrice: 100,
      maxPrice: 200,
      totalParsed: 2,
      soldOnly: false
    });

    const overlay = document.getElementById('mer-helper-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('出品中：1');
    expect(overlay.textContent).toContain('売り切れ：1');
  });

  test('runtime listener toggles overlay display and responds to ping', async () => {
    jest.doMock('../content-metrics', () => createMetricsMock());
    require('../content.js');

    const listener = chromeMock.runtimeOnMessage.getListeners()[0];
    const sendResponse = jest.fn();

    listener({ scope: 'mer-helper', type: 'toggleOverlay' }, {}, sendResponse);
    await flushTimers(1);

    expect(sendResponse).toHaveBeenCalledWith({ ok: true, result: true });
    const overlay = document.getElementById('mer-helper-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.style.display).toBe('none');

    sendResponse.mockClear();
    listener({ scope: 'mer-helper', type: 'toggleOverlay' }, {}, sendResponse);
    await flushTimers(1);

    expect(sendResponse).toHaveBeenCalledWith({ ok: true, result: true });
    expect(overlay.style.display).toBe('block');

    const pingResponse = jest.fn();
    listener({ scope: 'mer-helper', type: 'ping' }, {}, pingResponse);
    await flushTimers(1);

    expect(pingResponse).toHaveBeenCalledWith({ ok: true, result: 'pong' });
  });

  test('logs transaction page visits via background', async () => {
    jest.doMock('../content-metrics', () => createMetricsMock());
    require('../content.js');

    document.body.innerHTML = `
      <div data-testid="transaction-item-name">サンプル商品</div>
      <div data-testid="transaction-price" data-price="1200">¥1,200</div>
      <time datetime="2024-03-01T09:30:00">2024/03/01 09:30</time>
    `;

    window.history.pushState({}, '', '/transaction/xyz123');

    jest.advanceTimersByTime(2000);
    await flushTimers(12);

    expect(logEntries.length).toBeGreaterThanOrEqual(1);
    expect(logEntries[0]).toEqual(expect.objectContaining({
      url: expect.stringContaining('/transaction/xyz123'),
      pageType: 'transaction-detail',
      title: expect.stringContaining('サンプル'),
      price: 1200
    }));
    if (logEntries[0].soldAt) {
      expect(logEntries[0].soldAt).toEqual(expect.stringContaining('2024'));
    }
  });
});
