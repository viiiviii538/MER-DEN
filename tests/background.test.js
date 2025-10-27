const { createChromeMock } = require('./chrome-mock');

describe('background.js', () => {
  let chromeMock;
  let fetchMock;

  const flushAsync = async () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    jest.resetModules();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock;
    chromeMock = createChromeMock();
  });

  afterEach(() => {
    delete global.chrome;
    delete global.fetch;
    jest.useRealTimers();
  });

  test('enqueue runs queued tasks sequentially', async () => {
    const background = require('../background.js');
    const { enqueue, __resetQueue } = background;

    const sequence = [];

    const first = enqueue(async () => {
      sequence.push('task1-start');
      await Promise.resolve();
      sequence.push('task1-end');
      return 1;
    });

    const second = enqueue(async () => {
      sequence.push('task2-start');
      await Promise.resolve();
      sequence.push('task2-end');
      return 2;
    });

    const third = enqueue(async () => {
      sequence.push('task3-start');
      return 3;
    });

    const results = await Promise.all([first, second, third]);

    expect(results).toEqual([1, 2, 3]);
    expect(sequence).toEqual([
      'task1-start',
      'task1-end',
      'task2-start',
      'task2-end',
      'task3-start'
    ]);

    __resetQueue();
  });

  test('runtime listener enqueues scrape requests and responds', async () => {
    const background = require('../background.js');
    const { __setEnqueueImplementation, __setKillSwitchForTests } = background;

    const enqueueMock = jest.fn().mockResolvedValue(45);
    __setEnqueueImplementation(enqueueMock);
    __setKillSwitchForTests(true);

    const listener = chromeMock.runtimeOnMessage.getListeners()[0];
    expect(listener).toBeInstanceOf(Function);

    const sendResponse = jest.fn();
    const handled = listener({ scope: 'mer-helper', type: 'bgScrapeLike', url: 'https://example.com/item/m123' }, {}, sendResponse);

    expect(handled).toBe(true);

    await flushAsync();

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const [taskFn] = enqueueMock.mock.calls[0];
    expect(typeof taskFn).toBe('function');

    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({ ok: true, value: 45 });

    background.__setEnqueueImplementation();
  });

  test('runtime listener returns disabled when kill switch is off', async () => {
    const background = require('../background.js');
    const { __setKillSwitchForTests } = background;

    __setKillSwitchForTests(false);

    const listener = chromeMock.runtimeOnMessage.getListeners()[0];
    const sendResponse = jest.fn();

    listener({ scope: 'mer-helper', type: 'bgScrapeLike', url: 'https://example.com/item/m1' }, {}, sendResponse);

    await flushAsync();

    expect(sendResponse).toHaveBeenCalledWith({ ok: false, disabled: true });
  });

  test('getKillSwitchStatus message returns cached status', async () => {
    const background = require('../background.js');
    const { __setKillSwitchForTests } = background;

    __setKillSwitchForTests(true);

    const listener = chromeMock.runtimeOnMessage.getListeners()[0];
    const sendResponse = jest.fn();

    listener({ scope: 'mer-helper', type: 'getKillSwitchStatus' }, {}, sendResponse);

    await flushAsync();

    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ ok: true, result: expect.objectContaining({ enabled: true }) }));
  });

  describe('scrapeLike and waitTabComplete', () => {
    test('scrapeLike falls back to alternate domain and increments counter on success', async () => {
      const background = require('../background.js');
      const { scrapeLike, __getProcessedThisRun, __setProcessedThisRun } = background;

      __setProcessedThisRun(0);

      const createMock = chromeMock.chrome.tabs.create;
      const executeMock = chromeMock.chrome.scripting.executeScript;
      const removeMock = chromeMock.chrome.tabs.remove;

      createMock
        .mockImplementationOnce(async ({ url }) => {
          expect(url).toBe('https://jp.mercari.com/item/m123');
          const tab = { id: 101 };
          setTimeout(() => {
            chromeMock.tabsOnUpdated.dispatch(tab.id, { status: 'complete' });
          }, 0);
          return tab;
        })
        .mockImplementationOnce(async ({ url }) => {
          expect(url).toBe('https://www.mercari.com/jp/items/m123/');
          const tab = { id: 202 };
          setTimeout(() => {
            chromeMock.tabsOnUpdated.dispatch(tab.id, { status: 'complete' });
          }, 0);
          return tab;
        });

      executeMock
        .mockResolvedValueOnce([{ result: { picked: null } }])
        .mockResolvedValueOnce([{ result: { picked: 12 } }]);

      const result = await scrapeLike('https://jp.mercari.com/item/m123');

      expect(result).toBe(12);
      expect(createMock).toHaveBeenCalledTimes(2);
      expect(executeMock).toHaveBeenCalledTimes(2);
      expect(removeMock).toHaveBeenCalledTimes(2);
      expect(removeMock).toHaveBeenCalledWith(101);
      expect(removeMock).toHaveBeenCalledWith(202);
      expect(__getProcessedThisRun()).toBe(1);
    });

    test('scrapeLike respects MAX_ITEMS_PER_RUN guard', async () => {
      const background = require('../background.js');
      const { scrapeLike, __setProcessedThisRun, __getMaxItemsPerRun } = background;

      __setProcessedThisRun(__getMaxItemsPerRun());

      const result = await scrapeLike('https://jp.mercari.com/item/m999');

      expect(result).toBeNull();
      expect(chromeMock.chrome.tabs.create).not.toHaveBeenCalled();
    });

    test('waitTabComplete resolves on complete event and unregisters listener', async () => {
      jest.useFakeTimers();
      const background = require('../background.js');
      const { waitTabComplete } = background;

      const promise = waitTabComplete(555, 5000);

      const [listener] = chromeMock.tabsOnUpdated.getListeners();
      expect(typeof listener).toBe('function');

      chromeMock.tabsOnUpdated.dispatch(555, { status: 'complete' });

      await expect(promise).resolves.toBe(true);
      expect(chromeMock.tabsOnUpdated.removeListener).toHaveBeenCalledWith(listener);
    });

    test('waitTabComplete times out and returns false', async () => {
      jest.useFakeTimers();
      const background = require('../background.js');
      const { waitTabComplete } = background;

      const promise = waitTabComplete(777, 2000);

      const [listener] = chromeMock.tabsOnUpdated.getListeners();
      expect(typeof listener).toBe('function');

      jest.advanceTimersByTime(2000);

      await expect(promise).resolves.toBe(false);
      expect(chromeMock.tabsOnUpdated.removeListener).toHaveBeenCalledWith(listener);
    });
  });
});
