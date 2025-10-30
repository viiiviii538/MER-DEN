// @ts-check
/// <reference path="./types/chrome.d.ts"/>

/**
 * @template {(...args: any[]) => any} TFunc
 * @typedef {jest.MockedFunction<TFunc>} JestMockedFunction
 */

/**
 * @template {unknown[]} TArgs
 * @typedef {(...args: TArgs) => void} Listener
 * リスナー関数の共通シグネチャ。
 */

/**
 * @template {unknown[]} TArgs
 * @typedef ListenerRegistry
 * イベントリスナーを管理するためのユーティリティ。
 * @property {{
 *   addListener: JestMockedFunction<(listener: Listener<TArgs>) => void>,
 *   removeListener: JestMockedFunction<(listener: Listener<TArgs>) => void>,
 *   hasListener: JestMockedFunction<(listener: Listener<TArgs>) => boolean>
 * }} api Chrome API 互換のメソッド群。
 * @property {JestMockedFunction<(listener: Listener<TArgs>) => void>} addListener リスナー登録モック。
 * @property {JestMockedFunction<(listener: Listener<TArgs>) => void>} removeListener リスナー解除モック。
 * @property {JestMockedFunction<(listener: Listener<TArgs>) => boolean>} hasListener リスナー存在確認モック。
 * @property {() => Listener<TArgs>[]} getListeners 現在登録されているリスナー一覧を取得する。
 * @property {(...args: TArgs) => void} dispatch 登録リスナーを順番に呼び出す。
 */

/**
 * ジェネリックにイベントリスナーを管理するヘルパーを作成する。
 *
 * @template {unknown[]} TArgs
 * @returns {ListenerRegistry<TArgs>}
 */
const createListenerRegistry = () => {
  /** @type {Set<Listener<TArgs>>} */
  const listeners = new Set();
  /** @type {JestMockedFunction<(listener: Listener<TArgs>) => void>} */
  const addListener = jest.fn((fn) => {
    if (typeof fn === 'function') listeners.add(fn);
  });
  /** @type {JestMockedFunction<(listener: Listener<TArgs>) => void>} */
  const removeListener = jest.fn((fn) => {
    listeners.delete(fn);
  });
  /** @type {JestMockedFunction<(listener: Listener<TArgs>) => boolean>} */
  const hasListener = jest.fn((fn) => listeners.has(fn));
  return /** @type {ListenerRegistry<TArgs>} */ ({
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
  });
};

/**
 * 指定したセクションに対してオーバーライドをマージする。
 *
 * @template TSection extends Record<string, unknown>
 * @param {TSection} base 既定のセクション値。
 * @param {Partial<TSection>} [override] オーバーライドする値。
 * @returns {TSection} マージ後のセクション。
 */
function mergeSection(base, override = {}) {
  return { ...base, ...override };
}

/**
 * テスト用にモック化された Chrome API の構造。
 *
 * @typedef {import('./types/chrome').ChromeRuntime & {
 *   sendMessage: JestMockedFunction<import('./types/chrome').ChromeRuntime['sendMessage']>;
 * }} ChromeRuntimeMock
 */

/**
 * タブ関連 API のモック構造。
 *
 * @typedef {import('./types/chrome').ChromeTabs & {
 *   query: JestMockedFunction<import('./types/chrome').ChromeTabs['query']>;
 *   sendMessage: JestMockedFunction<import('./types/chrome').ChromeTabs['sendMessage']>;
 *   create: JestMockedFunction<import('./types/chrome').ChromeTabs['create']>;
 *   remove: JestMockedFunction<import('./types/chrome').ChromeTabs['remove']>;
 * }} ChromeTabsMock
 */

/**
 * storage.local API のモック構造。
 *
 * @typedef {import('./types/chrome').ChromeStorageArea & {
 *   get: JestMockedFunction<import('./types/chrome').ChromeStorageArea['get']>;
 *   set: JestMockedFunction<import('./types/chrome').ChromeStorageArea['set']>;
 * }} ChromeStorageAreaMock
 */

/**
 * scripting API のモック構造。
 *
 * @typedef {import('./types/chrome').ChromeScripting & {
 *   executeScript: JestMockedFunction<import('./types/chrome').ChromeScripting['executeScript']>;
 * }} ChromeScriptingMock
 */

/**
 * alarms API のモック構造。
 *
 * @typedef {import('./types/chrome').ChromeAlarms & {
 *   create: JestMockedFunction<import('./types/chrome').ChromeAlarms['create']>;
 *   clear: JestMockedFunction<(name: string) => Promise<boolean>>;
 * }} ChromeAlarmsMock
 */

/**
 * Chrome API を Jest モックで置き換えたテスト用オブジェクト。
 *
 * @typedef {object} ChromeMock
 * @property {{
 *   runtime: ChromeRuntimeMock;
 *   tabs: ChromeTabsMock;
 *   storage: { local: ChromeStorageAreaMock };
 *   alarms: ChromeAlarmsMock;
 *   scripting: ChromeScriptingMock;
 * }} chrome 実際にテストへ提供する Chrome 互換オブジェクト。
 * @property {ListenerRegistry<[import('./types/chrome').MerHelperMessage, import('./types/chrome').ChromeMessageSender, (response: import('./types/chrome').MerHelperResponse) => void]>} runtimeOnMessage runtime.onMessage のリスナー管理。
 * @property {ListenerRegistry<[number, import('./types/chrome').ChromeTabChangeInfo, import('./types/chrome').ChromeTab]>} tabsOnUpdated tabs.onUpdated のリスナー管理。
 * @property {ListenerRegistry<[import('./types/chrome').ChromeAlarm]>} alarmsOnAlarm alarms.onAlarm のリスナー管理。
 */

/**
 * Chrome API をテストしやすい Jest モックに差し替える。
 *
 * @param {Partial<ChromeMock['chrome']>} [overrides] カスタム動作を指定するオーバーライド。
 * @returns {ChromeMock} Chrome 互換モックとイベントハンドラ管理を返す。
 */
function createChromeMock(overrides = {}) {
  const runtimeOnMessage = /** @type {ListenerRegistry<[
    import('./types/chrome').MerHelperMessage,
    import('./types/chrome').ChromeMessageSender,
    (response: import('./types/chrome').MerHelperResponse) => void
  ]>} */ (createListenerRegistry());
  const tabsOnUpdated = /** @type {ListenerRegistry<[
    number,
    import('./types/chrome').ChromeTabChangeInfo,
    import('./types/chrome').ChromeTab
  ]>} */ (createListenerRegistry());
  const alarmsOnAlarm = /** @type {ListenerRegistry<[
    import('./types/chrome').ChromeAlarm
  ]>} */ (createListenerRegistry());

  /** @type {ChromeMock['chrome']} */
  const defaultChrome = {
    runtime: {
      sendMessage: /** @type {ChromeRuntimeMock['sendMessage']} */ (
        jest.fn().mockResolvedValue({ ok: true })
      ),
      onMessage: runtimeOnMessage.api
    },
    tabs: {
      query: /** @type {ChromeTabsMock['query']} */ (jest.fn().mockResolvedValue([])),
      sendMessage: /** @type {ChromeTabsMock['sendMessage']} */ (
        jest.fn().mockResolvedValue({ ok: true })
      ),
      onUpdated: tabsOnUpdated.api,
      create: /** @type {ChromeTabsMock['create']} */ (jest.fn().mockResolvedValue({})),
      remove: /** @type {ChromeTabsMock['remove']} */ (jest.fn().mockResolvedValue(undefined))
    },
    scripting: {
      executeScript: /** @type {ChromeScriptingMock['executeScript']} */ (
        jest.fn().mockResolvedValue([])
      )
    },
    storage: {
      local: {
        get: /** @type {ChromeStorageAreaMock['get']} */ (jest.fn().mockResolvedValue({})),
        set: /** @type {ChromeStorageAreaMock['set']} */ (
          jest.fn().mockResolvedValue(undefined)
        )
      }
    },
    alarms: {
      create: /** @type {ChromeAlarmsMock['create']} */ (
        jest.fn().mockResolvedValue(undefined)
      ),
      clear: /** @type {ChromeAlarmsMock['clear']} */ (jest.fn().mockResolvedValue(true)),
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
