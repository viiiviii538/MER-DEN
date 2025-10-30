/**
 * UC1: いいね数を取得する結合テストの雛形です。
 * 初心者でも追えるように、登場人物と動き方をコメントで丁寧に説明します。
 * 今はポート（通信口）をぜんぶテスト内でモック化し、Chrome 実機を使わずに流れだけ確認します。
 */

/**
 * RuntimePort: コンテンツスクリプトと背景スクリプトの橋渡しを行う仮想メッセージ通路です。
 * @typedef {{
 *   onMessage: (handler: (message: any) => Promise<any>) => void;
 *   sendMessage: (message: any) => Promise<any>;
 * }} RuntimePort
 */

/**
 * NetworkPort: タブ操作や DOM 解析を肩代わりする窓口の最小インターフェースです。
 * @typedef {{
 *   openLikeDetail: (url: string) => Promise<{ tabId: number }>;
 *   waitForComplete: (tabId: number, timeoutMs: number) => Promise<boolean>;
 *   readLikeCount: (tabId: number) => Promise<number>;
 *   closeLikeDetail: (tabId: number) => Promise<void>;
 * }} NetworkPort
 */

/**
 * StoragePort: キャッシュやログを管理する倉庫係です。
 * @typedef {{
 *   isKillSwitchEnabled: () => boolean;
 *   recordLikeResult: (payload: { url: string; value: number }) => void;
 * }} StoragePort
 */

/**
 * PopupPort: バッジやユーザー向け表示を更新する係です。
 * @typedef {{
 *   updateBadgeText: (text: string) => void;
 *   pushToast: (text: string) => void;
 * }} PopupPort
 */

/**
 * Runtime ポートをテスト用に生成します。背景が onMessage で登録したハンドラに、
 * コンテンツ側の sendMessage が直結するシンプルなバスです。
 * この作りにより、Chrome なしでも背景↔コンテンツの往復を再現できます。
 * @returns {RuntimePort}
 */
function createRuntimePortMock() {
  /** @type {(message: any) => Promise<any>} */
  let registeredHandler = async () => {
    throw new Error('handler not registered');
  };

  return {
    onMessage(handler) {
      registeredHandler = handler;
    },
    async sendMessage(message) {
      return registeredHandler(message);
    }
  };
}

/**
 * ネットワーク系ポートのモック生成です。Jest のモック関数で呼び出し履歴を記録します。
 * @returns {NetworkPort & { mocks: { openLikeDetail: jest.Mock; waitForComplete: jest.Mock; readLikeCount: jest.Mock; closeLikeDetail: jest.Mock } }}
 */
function createNetworkPortMock() {
  const openLikeDetail = jest.fn(async () => ({ tabId: 1 }));
  const waitForComplete = jest.fn(async () => true);
  const readLikeCount = jest.fn(async () => 0);
  const closeLikeDetail = jest.fn(async () => undefined);

  return {
    openLikeDetail,
    waitForComplete,
    readLikeCount,
    closeLikeDetail,
    mocks: { openLikeDetail, waitForComplete, readLikeCount, closeLikeDetail }
  };
}

/**
 * ストレージポートのモックです。キルスイッチ状態とログ記録を in-memory で管理します。
 * @param {boolean} enabled - 初期キルスイッチ状態。
 * @returns {StoragePort & { recorded: Array<{ url: string; value: number }> }}
 */
function createStoragePortMock(enabled) {
  const recorded = [];
  return {
    isKillSwitchEnabled: jest.fn(() => enabled),
    recordLikeResult: jest.fn((payload) => {
      recorded.push(payload);
    }),
    recorded
  };
}

/**
 * ポップアップポートのモックです。バッジ文言と通知文言を保存しておきます。
 * @returns {PopupPort & { badgeHistory: string[]; toastHistory: string[] }}
 */
function createPopupPortMock() {
  const badgeHistory = [];
  const toastHistory = [];
  return {
    updateBadgeText: jest.fn((text) => {
      badgeHistory.push(text);
    }),
    pushToast: jest.fn((text) => {
      toastHistory.push(text);
    }),
    badgeHistory,
    toastHistory
  };
}

/**
 * 背景スクリプト側の処理をテスト用に取りまとめます。
 * ここではシンプルに 1 メッセージ（bgScrapeLike）だけを扱い、
 * 即エラー化の規約に従う例を作っています。
 * @param {RuntimePort} runtimePort
 * @param {NetworkPort} networkPort
 * @param {StoragePort} storagePort
 * @param {PopupPort} popupPort
 */
function mountBackgroundLikeHandler(runtimePort, networkPort, storagePort, popupPort) {
  runtimePort.onMessage(async (message) => {
    if (!message || message.type !== 'bgScrapeLike') {
      throw new Error('unknown type');
    }

    if (!storagePort.isKillSwitchEnabled()) {
      return { ok: false, disabled: true };
    }

    try {
      const tabInfo = await networkPort.openLikeDetail(message.url);
      const ready = await networkPort.waitForComplete(tabInfo.tabId, 20_000);
      if (!ready) {
        throw Object.assign(new Error('tab timeout'), { reason: 'waitForComplete returned false' });
      }

      const likeValue = await networkPort.readLikeCount(tabInfo.tabId);
      await networkPort.closeLikeDetail(tabInfo.tabId);

      popupPort.updateBadgeText(`♥${likeValue}`);
      popupPort.pushToast('最新のいいね数を反映しました');
      storagePort.recordLikeResult({ url: message.url, value: likeValue });

      return { ok: true, value: likeValue };
    } catch (error) {
      return { ok: false, error: error.message, reason: error.reason };
    }
  });
}

describe('UC1: bgScrapeLike 連携（雛形）', () => {
  it('正常系: いいね数を取得してバッジとログを更新する', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock(true);
    const popupPort = createPopupPortMock();

    networkPort.mocks.openLikeDetail.mockResolvedValueOnce({ tabId: 1001 });
    networkPort.mocks.waitForComplete.mockResolvedValueOnce(true);
    networkPort.mocks.readLikeCount.mockResolvedValueOnce(42);

    mountBackgroundLikeHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await runtimePort.sendMessage({ scope: 'mer-helper', type: 'bgScrapeLike', url: 'https://example.com/item/m1' });

    expect(response).toEqual({ ok: true, value: 42 });
    expect(networkPort.mocks.openLikeDetail).toHaveBeenCalledTimes(1);
    expect(networkPort.mocks.waitForComplete).toHaveBeenCalledWith(1001, 20_000);
    expect(networkPort.mocks.readLikeCount).toHaveBeenCalledWith(1001);
    expect(networkPort.mocks.closeLikeDetail).toHaveBeenCalledWith(1001);

    expect(popupPort.updateBadgeText).toHaveBeenCalledWith('♥42');
    expect(popupPort.pushToast).toHaveBeenCalledWith('最新のいいね数を反映しました');
    expect(storagePort.recordLikeResult).toHaveBeenCalledWith({ url: 'https://example.com/item/m1', value: 42 });
    expect(storagePort.recorded).toEqual([{ url: 'https://example.com/item/m1', value: 42 }]);
  });

  it('失敗系a: キルスイッチが無効なら即 { ok:false, disabled:true } を返す', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock(false);
    const popupPort = createPopupPortMock();

    mountBackgroundLikeHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await runtimePort.sendMessage({ scope: 'mer-helper', type: 'bgScrapeLike', url: 'https://example.com/item/m2' });

    expect(response).toEqual({ ok: false, disabled: true });
    expect(networkPort.mocks.openLikeDetail).not.toHaveBeenCalled();
    expect(popupPort.updateBadgeText).not.toHaveBeenCalled();
    expect(storagePort.recordLikeResult).not.toHaveBeenCalled();
  });

  it('失敗系b: waitForComplete が false なら tab timeout で即エラー化する', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock(true);
    const popupPort = createPopupPortMock();

    networkPort.mocks.openLikeDetail.mockResolvedValueOnce({ tabId: 2002 });
    networkPort.mocks.waitForComplete.mockResolvedValueOnce(false);

    mountBackgroundLikeHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await runtimePort.sendMessage({ scope: 'mer-helper', type: 'bgScrapeLike', url: 'https://example.com/item/m3' });

    expect(response).toEqual({ ok: false, error: 'tab timeout', reason: 'waitForComplete returned false' });
    expect(networkPort.mocks.readLikeCount).not.toHaveBeenCalled();
    expect(popupPort.updateBadgeText).not.toHaveBeenCalled();
    expect(storagePort.recordLikeResult).not.toHaveBeenCalled();
  });
});

// 高校生向けレビュー: 背景係が「いいね数教えて！」と言われたら、
// まずスイッチが ON かチェックして、OK ならページを開いて ♥ 数を読み取り、
// 成功したらバッジを更新して記録する、ダメならすぐ「失敗したよ」と返す練習です。
