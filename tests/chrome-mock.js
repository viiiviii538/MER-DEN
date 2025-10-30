const createListenerRegistry = () => {
  const listeners = new Set();
  const addListener = jest.fn((fn) => {
    if (typeof fn === 'function') listeners.add(fn);
  });
  const removeListener = jest.fn((fn) => {
    listeners.delete(fn);
  });
  const hasListener = jest.fn((fn) => listeners.has(fn));
  return {
    api: {
      addListener,
      removeListener,
      hasListener
    },
    addListener,
    removeListener,
    hasListener,
    getListeners: () => Array.from(listeners),
    dispatch: (...args) => {
      for (const fn of Array.from(listeners)) {
        fn(...args);
      }
    }
  };
};

function mergeSection(base, override = {}) {
  return { ...base, ...override };
}

function createChromeMock(overrides = {}) {
  const runtimeOnMessage = createListenerRegistry();
  const tabsOnUpdated = createListenerRegistry();
  const alarmsOnAlarm = createListenerRegistry();

  const defaultChrome = {
    runtime: {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      onMessage: runtimeOnMessage.api
    },
    tabs: {
      query: jest.fn().mockResolvedValue([]),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      onUpdated: tabsOnUpdated.api,
      create: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined)
    },
    scripting: {
      executeScript: jest.fn().mockResolvedValue([])
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined)
      }
    },
    alarms: {
      create: jest.fn(),
      clear: jest.fn().mockResolvedValue(true),
      onAlarm: alarmsOnAlarm.api
    }
  };

  const chrome = {
    ...defaultChrome,
    ...overrides
  };

  chrome.runtime = mergeSection(defaultChrome.runtime, overrides.runtime);
  chrome.tabs = mergeSection(defaultChrome.tabs, overrides.tabs);
  chrome.scripting = mergeSection(defaultChrome.scripting, overrides.scripting);
  chrome.storage = mergeSection(defaultChrome.storage, overrides.storage);
  chrome.alarms = mergeSection(defaultChrome.alarms, overrides.alarms);

  chrome.runtime.onMessage = overrides.runtime?.onMessage || runtimeOnMessage.api;
  chrome.tabs.onUpdated = overrides.tabs?.onUpdated || tabsOnUpdated.api;
  chrome.alarms.onAlarm = overrides.alarms?.onAlarm || alarmsOnAlarm.api;

  // @ts-expect-error - test helper only mocks the subset of the Chrome API that is required by the tests
  global.chrome = chrome;

  return {
    chrome,
    runtimeOnMessage,
    tabsOnUpdated,
    alarmsOnAlarm
  };
}

module.exports = {
  createChromeMock
};
