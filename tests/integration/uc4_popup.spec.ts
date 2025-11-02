/**
 * UC4: Popup からの指示がコンテンツへ届く結合テスト雛形です。
 * キルスイッチ確認と overlay 切替の流れだけをモックで追う予定です。
 */

// Jest の設定は既存のままで十分であり、moduleNameMapper などを追加しなくても
// `require('../../src/...')` の相対 import で後続 PR の実装を記述できることを確認済みです。
// ここではその前提をコメントに残しておきます。

type RuntimePort = {
  onMessage: (handler: (message: unknown) => Promise<unknown>) => void;
  sendMessage: (message: unknown) => Promise<unknown>;
};

type NetworkPort = {
  sendToContent: (command: 'scan' | 'toggleOverlay') => Promise<{ ok: boolean }>;
};

type StoragePort = {
  waitForKillSwitchStatus: () => Promise<{ enabled: boolean }>;
};

type PopupPort = {
  markScanning: () => void;
  showOverlay: () => void;
  hideOverlay: () => void;
};

type PopupSuccess = { ok: true };
type PopupDisabled = { ok: false; disabled: true };
type PopupFailure = { ok: false; error: string };

/**
 * 想定する JSON 応答の形:
 * - 成功時: { ok: true }
 * - キルスイッチが無効: { ok: false, disabled: true }
 * - エラー時: { ok: false, error: string }
 */

describe('UC4: Popup 操作（雛形）', () => {
  it('normal', async () => {
    // TODO: scan と toggleOverlay を順番に呼び出した際の成功応答を検証する
  });

  it('edge', async () => {
    // TODO: キルスイッチが無効だった場合に disabled 応答となる境界ケースを検証する
  });

  it('invalid', async () => {
    // TODO: 未知のコマンドや sendToContent の失敗に対するエラー処理を検証する
  });
});

// 高校生向けレビュー: 部室から「今から掃除開始！」と連絡するとき、
// 顧問の許可を確かめ、ダメなら「今日は中止」と全員へ伝える流れを再現する計画です。
