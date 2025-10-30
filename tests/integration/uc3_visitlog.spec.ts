/**
 * UC3: 取引ログ送信の結合テスト雛形です。
 * 送信の重複判定と失敗時の即エラー化ルールをモックで確認します。
 */

/**
 * RuntimePort 型定義。
 * @typedef {{
 *   onMessage: (handler: (message: any) => Promise<any>) => void;
 *   sendMessage: (message: any) => Promise<any>;
 * }} RuntimePort
 */

/**
 * NetworkPort: GAS への送信を担当する仮想窓口です。
 * @typedef {{
 *   postVisitLog: (entry: { signature: string; payload: any }) => Promise<{ ok: boolean; deduped?: boolean; error?: string }>;
 * }} NetworkPort
 */

/**
 * StoragePort: 最後に送った署名を覚えておくシンプルな倉庫です。
 * @typedef {{
 *   getLastSignature: () => { signature: string; timestamp: number } | null;
 *   saveLastSignature: (entry: { signature: string; timestamp: number }) => void;
 * }} StoragePort
 */

/**
 * PopupPort: 成功・失敗をユーザーに知らせる係です。
 * @typedef {{
 *   notifySuccess: (message: string) => void;
 *   notifyFailure: (message: string) => void;
 * }} PopupPort
 */

function createRuntimePortMock() {
  /** @type {(message: any) => Promise<any>} */
  let handler = async () => {
    throw new Error('listener missing');
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
  const postVisitLog = jest.fn(async () => ({ ok: true, deduped: false }));
  return { postVisitLog, mocks: { postVisitLog } };
}

function createStoragePortMock() {
  let last = null;
  return {
    getLastSignature: jest.fn(() => last),
    saveLastSignature: jest.fn((entry) => {
      last = entry;
    })
  };
}

function createPopupPortMock() {
  const notifySuccess = jest.fn();
  const notifyFailure = jest.fn();
  return { notifySuccess, notifyFailure };
}

/**
 * 背景側の仮実装。logPageVisit メッセージを処理します。
 * @param {RuntimePort} runtimePort
 * @param {NetworkPort} networkPort
 * @param {StoragePort} storagePort
 * @param {PopupPort} popupPort
 */
function mountVisitLogHandler(runtimePort, networkPort, storagePort, popupPort) {
  runtimePort.onMessage(async (message) => {
    if (!message || message.type !== 'logPageVisit') {
      throw new Error('unknown type');
    }

    const now = Date.now();
    const signature = message.payload.signature;
    const last = storagePort.getLastSignature();
    if (last && last.signature === signature && now - last.timestamp < 10 * 60_000) {
      return { ok: true, deduped: true };
    }

    const request = { signature, payload: message.payload };

    try {
      const response = await networkPort.postVisitLog(request);
      if (!response.ok) {
        throw new Error(response.error || 'unknown');
      }

      storagePort.saveLastSignature({ signature, timestamp: now });
      popupPort.notifySuccess('ログ送信に成功しました');

      return { ok: true, deduped: !!response.deduped };
    } catch (error) {
      popupPort.notifyFailure(error.message || 'unknown');
      return { ok: false, error: error.message || 'unknown' };
    }
  });
}

describe('UC3: Visit log 送信（雛形）', () => {
  it('正常系: 初回送信は postVisitLog が呼ばれ、署名が保存される', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock();
    const popupPort = createPopupPortMock();

    mountVisitLogHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await runtimePort.sendMessage({
      scope: 'mer-helper',
      type: 'logPageVisit',
      payload: { signature: 'item-1', url: 'https://example.com/item/m1' }
    });

    expect(response).toEqual({ ok: true, deduped: false });
    expect(networkPort.mocks.postVisitLog).toHaveBeenCalledTimes(1);
    expect(storagePort.saveLastSignature).toHaveBeenCalledTimes(1);
    expect(popupPort.notifySuccess).toHaveBeenCalledWith('ログ送信に成功しました');
  });

  it('正常系: 同じ署名を短時間に送ると deduped:true で早期終了する', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock();
    const popupPort = createPopupPortMock();

    const now = Date.now();
    storagePort.getLastSignature.mockReturnValueOnce({ signature: 'item-1', timestamp: now });

    mountVisitLogHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await runtimePort.sendMessage({
      scope: 'mer-helper',
      type: 'logPageVisit',
      payload: { signature: 'item-1', url: 'https://example.com/item/m1' }
    });

    expect(response).toEqual({ ok: true, deduped: true });
    expect(networkPort.mocks.postVisitLog).not.toHaveBeenCalled();
    expect(popupPort.notifySuccess).not.toHaveBeenCalled();
    expect(storagePort.saveLastSignature).not.toHaveBeenCalled();
  });

  it('失敗系: postVisitLog が例外を出したら即エラー化し、再送は行わない', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock();
    const popupPort = createPopupPortMock();

    networkPort.mocks.postVisitLog.mockResolvedValueOnce({ ok: false, error: '500' });

    mountVisitLogHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await runtimePort.sendMessage({
      scope: 'mer-helper',
      type: 'logPageVisit',
      payload: { signature: 'item-2', url: 'https://example.com/item/m2' }
    });

    expect(response).toEqual({ ok: false, error: '500' });
    expect(networkPort.mocks.postVisitLog).toHaveBeenCalledTimes(1);
    expect(storagePort.saveLastSignature).not.toHaveBeenCalled();
    expect(popupPort.notifyFailure).toHaveBeenCalledWith('500');
  });
});

// 高校生向けレビュー: 同じ提出物は 1 回だけ送るルールを守り、先生が受け取れなかったら即座に報告して次の提出は止める、という流れを練習しています。
