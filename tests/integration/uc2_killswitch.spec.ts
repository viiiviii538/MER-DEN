/**
 * UC2: キルスイッチ制御の結合テスト雛形です。
 * ここではリモート問い合わせとローカルキャッシュの最小フローをモックで再現します。
 */

/**
 * RuntimePort の型定義（テスト専用）。
 * @typedef {{
 *   onMessage: (handler: (message: any) => Promise<any>) => void;
 *   sendMessage: (message: any) => Promise<any>;
 * }} RuntimePort
 */

/**
 * NetworkPort: リモートの kill switch を取得する入口です。
 * @typedef {{
 *   fetchKillSwitchFromRemote: () => Promise<{ enabled: boolean }>;
 * }} NetworkPort
 */

/**
 * StoragePort: キャッシュと失敗回数を管理するための最小機能です。
 * @typedef {{
 *   getCachedKillSwitch: () => { enabled: boolean; checkedAt: number } | null;
 *   saveCachedKillSwitch: (snapshot: { enabled: boolean; checkedAt: number }) => void;
 *   incrementFailure: () => number;
 *   resetFailure: () => void;
 * }} StoragePort
 */

/**
 * PopupPort: UI 表示を切り替える窓口です。
 * @typedef {{
 *   applyKillSwitchState: (enabled: boolean) => void;
 *   showError: (message: string) => void;
 * }} PopupPort
 */

function createRuntimePortMock() {
  /** @type {(message: any) => Promise<any>} */
  let handler = async () => {
    throw new Error('handler missing');
  };
  return {
    onMessage(fn) {
      handler = fn;
    },
    async sendMessage(message) {
      return handler(message);
    }
  };
}

function createNetworkPortMock() {
  const fetchKillSwitchFromRemote = jest.fn(async () => ({ enabled: true }));
  return { fetchKillSwitchFromRemote, mocks: { fetchKillSwitchFromRemote } };
}

function createStoragePortMock() {
  let cached = null;
  let failure = 0;
  return {
    getCachedKillSwitch: jest.fn(() => cached),
    saveCachedKillSwitch: jest.fn((snapshot) => {
      cached = snapshot;
    }),
    incrementFailure: jest.fn(() => {
      failure += 1;
      return failure;
    }),
    resetFailure: jest.fn(() => {
      failure = 0;
    })
  };
}

function createPopupPortMock() {
  const applyKillSwitchState = jest.fn();
  const showError = jest.fn();
  return { applyKillSwitchState, showError };
}

/**
 * 背景スクリプト側の仮実装です。getKillSwitchStatus メッセージのみを扱います。
 * @param {RuntimePort} runtimePort
 * @param {NetworkPort} networkPort
 * @param {StoragePort} storagePort
 * @param {PopupPort} popupPort
 */
function mountKillSwitchHandler(runtimePort, networkPort, storagePort, popupPort) {
  runtimePort.onMessage(async (message) => {
    if (!message || message.type !== 'getKillSwitchStatus') {
      throw new Error('unknown type');
    }

    const now = Date.now();
    if (!message.force) {
      const cached = storagePort.getCachedKillSwitch();
      if (cached && now - cached.checkedAt < 60_000) {
        popupPort.applyKillSwitchState(cached.enabled);
        return { ok: true, result: { enabled: cached.enabled, source: 'cache' } };
      }
    }

    try {
      const remote = await networkPort.fetchKillSwitchFromRemote();
      storagePort.saveCachedKillSwitch({ enabled: remote.enabled, checkedAt: now });
      storagePort.resetFailure();
      popupPort.applyKillSwitchState(remote.enabled);
      return { ok: true, result: { enabled: remote.enabled, source: 'remote' } };
    } catch (error) {
      const failures = storagePort.incrementFailure();
      popupPort.applyKillSwitchState(false);
      popupPort.showError(error.message || 'unknown');
      return { ok: false, error: error.message || 'unknown', result: { enabled: false, failures } };
    }
  });
}

/**
 * コンテンツ側でキルスイッチを確認する小さなユーティリティです。
 * 最大 2 回までリトライし、それ以上は諦めて OFF 扱いにします。
 * @param {RuntimePort} runtimePort
 * @param {(enabled: boolean) => void} applyState
 */
async function requestKillSwitchWithRetry(runtimePort, applyState) {
  const MAX_ATTEMPTS = 2;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await runtimePort.sendMessage({ scope: 'mer-helper', type: 'getKillSwitchStatus', force: attempt > 0 });
    if (response.ok) {
      applyState(response.result.enabled);
      return response;
    }
    if (attempt === MAX_ATTEMPTS - 1) {
      applyState(false);
      return response;
    }
  }
  throw new Error('unreachable');
}

describe('UC2: Kill switch 初期化（雛形）', () => {
  it('正常系: リモートが enabled:true を返し UI に適用される', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock();
    const popupPort = createPopupPortMock();

    mountKillSwitchHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await requestKillSwitchWithRetry(runtimePort, popupPort.applyKillSwitchState);

    expect(response).toEqual({ ok: true, result: { enabled: true, source: 'remote' } });
    expect(networkPort.mocks.fetchKillSwitchFromRemote).toHaveBeenCalledTimes(1);
    expect(storagePort.saveCachedKillSwitch).toHaveBeenCalledTimes(1);
    expect(popupPort.applyKillSwitchState).toHaveBeenCalledWith(true);
    expect(popupPort.showError).not.toHaveBeenCalled();
  });

  it('失敗系: HTTP 失敗なら { ok:false } を返し、OFF へ切り替えてリトライは 2 回まで', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock();
    const popupPort = createPopupPortMock();

    networkPort.mocks.fetchKillSwitchFromRemote.mockRejectedValueOnce(new Error('timeout'));
    networkPort.mocks.fetchKillSwitchFromRemote.mockRejectedValueOnce(new Error('http 500'));

    mountKillSwitchHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await requestKillSwitchWithRetry(runtimePort, popupPort.applyKillSwitchState);

    expect(networkPort.mocks.fetchKillSwitchFromRemote).toHaveBeenCalledTimes(2);
    expect(response.ok).toBe(false);
    expect(response.result.enabled).toBe(false);
    expect(storagePort.incrementFailure).toHaveBeenCalledTimes(2);
    expect(popupPort.applyKillSwitchState).toHaveBeenLastCalledWith(false);
    expect(popupPort.showError).toHaveBeenNthCalledWith(1, 'timeout');
    expect(popupPort.showError).toHaveBeenNthCalledWith(2, 'http 500');
  });
});

// 高校生向けレビュー: 遠くの先生に「活動していいですか？」と聞き、OK ならそのまま、
// 返事が遅れたら 2 回だけ聞き直し、それでもダメなら活動停止にするという流れを予行演習しています。
