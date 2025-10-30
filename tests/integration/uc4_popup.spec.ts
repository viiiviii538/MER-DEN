/**
 * UC4: Popup からの指示がコンテンツへ届く結合テスト雛形です。
 * キルスイッチ確認と overlay 切替の流れだけをモックで追います。
 */

/**
 * RuntimePort 型。
 * @typedef {{
 *   onMessage: (handler: (message: any) => Promise<any>) => void;
 *   sendMessage: (message: any) => Promise<any>;
 * }} RuntimePort
 */

/**
 * NetworkPort: コンテンツスクリプトへの命令送信を担当します。
 * @typedef {{
 *   sendToContent: (command: 'scan' | 'toggleOverlay') => Promise<{ ok: boolean }>
 * }} NetworkPort
 */

/**
 * StoragePort: キルスイッチを待ち受ける役目を担います。
 * @typedef {{
 *   waitForKillSwitchStatus: () => Promise<{ enabled: boolean }>;
 * }} StoragePort
 */

/**
 * PopupPort: UI 状態の更新を担当します。
 * @typedef {{
 *   markScanning: () => void;
 *   showOverlay: () => void;
 *   hideOverlay: () => void;
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
  const sendToContent = jest.fn(async () => ({ ok: true }));
  return { sendToContent, mocks: { sendToContent } };
}

function createStoragePortMock() {
  const waitForKillSwitchStatus = jest.fn(async () => ({ enabled: true }));
  return { waitForKillSwitchStatus, mocks: { waitForKillSwitchStatus } };
}

function createPopupPortMock() {
  const markScanning = jest.fn();
  const showOverlay = jest.fn();
  const hideOverlay = jest.fn();
  return { markScanning, showOverlay, hideOverlay };
}

/**
 * 背景スクリプト側のハンドラを設定します。
 * @param {RuntimePort} runtimePort
 * @param {NetworkPort} networkPort
 * @param {StoragePort} storagePort
 * @param {PopupPort} popupPort
 */
function mountPopupHandler(runtimePort, networkPort, storagePort, popupPort) {
  runtimePort.onMessage(async (message) => {
    if (!message || message.type !== 'popupCommand') {
      throw new Error('unknown type');
    }

    const status = await storagePort.waitForKillSwitchStatus();
    if (!status.enabled) {
      return { ok: false, disabled: true };
    }

    if (message.command === 'scan') {
      const result = await networkPort.sendToContent('scan');
      if (!result.ok) {
        throw new Error('scan failed');
      }
      popupPort.markScanning();
      return { ok: true };
    }

    if (message.command === 'toggleOverlay') {
      const result = await networkPort.sendToContent('toggleOverlay');
      if (!result.ok) {
        throw new Error('toggle failed');
      }
      popupPort.showOverlay();
      return { ok: true };
    }

    throw new Error('unknown command');
  });
}

/**
 * Popup 側から指示を送る小さなユーティリティです。
 * @param {RuntimePort} runtimePort
 * @param {'scan' | 'toggleOverlay'} command
 */
async function sendPopupCommand(runtimePort, command) {
  return runtimePort.sendMessage({ scope: 'mer-helper', type: 'popupCommand', command });
}

describe('UC4: Popup 操作（雛形）', () => {
  it('正常系: scan と toggleOverlay が ok:true を返し UI が更新される', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock();
    const popupPort = createPopupPortMock();

    mountPopupHandler(runtimePort, networkPort, storagePort, popupPort);

    const scanResponse = await sendPopupCommand(runtimePort, 'scan');
    const toggleResponse = await sendPopupCommand(runtimePort, 'toggleOverlay');

    expect(scanResponse).toEqual({ ok: true });
    expect(toggleResponse).toEqual({ ok: true });
    expect(networkPort.mocks.sendToContent).toHaveBeenNthCalledWith(1, 'scan');
    expect(networkPort.mocks.sendToContent).toHaveBeenNthCalledWith(2, 'toggleOverlay');
    expect(popupPort.markScanning).toHaveBeenCalled();
    expect(popupPort.showOverlay).toHaveBeenCalled();
    expect(popupPort.hideOverlay).not.toHaveBeenCalled();
  });

  it('失敗系: waitForKillSwitchStatus が失敗したら disabled 応答で UI は変わらない', async () => {
    const runtimePort = createRuntimePortMock();
    const networkPort = createNetworkPortMock();
    const storagePort = createStoragePortMock();
    const popupPort = createPopupPortMock();

    storagePort.mocks.waitForKillSwitchStatus.mockResolvedValueOnce({ enabled: false });

    mountPopupHandler(runtimePort, networkPort, storagePort, popupPort);

    const response = await sendPopupCommand(runtimePort, 'scan');

    expect(response).toEqual({ ok: false, disabled: true });
    expect(networkPort.mocks.sendToContent).not.toHaveBeenCalled();
    expect(popupPort.markScanning).not.toHaveBeenCalled();
    expect(popupPort.showOverlay).not.toHaveBeenCalled();
  });
});

// 高校生向けレビュー: 部室から教室に「今から掃除開始！」と連絡する前に、
// 先生の許可が出ているかを確認し、ダメなら即「今回は中止」と全員に伝える練習です。
