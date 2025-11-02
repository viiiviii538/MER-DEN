/**
 * UC2: キルスイッチ制御の結合テスト雛形です。
 * ここではリモート問い合わせとローカルキャッシュの最小フローをモックで再現する予定です。
 */

// Jest の設定は package.json に記載されたデフォルト値（<rootDir> = プロジェクト直下）のままです。
// 後続 PR では `require('../../src/...')` の相対 import を追加するだけで結合テストを書けるため、
// ここではその前提をコメントとして残しておきます。

type RuntimePort = {
  onMessage: (handler: (message: unknown) => Promise<unknown>) => void;
  sendMessage: (message: unknown) => Promise<unknown>;
};

type NetworkPort = {
  fetchKillSwitchFromRemote: () => Promise<{ enabled: boolean }>;
};

type StoragePort = {
  getCachedKillSwitch: () => { enabled: boolean; checkedAt: number } | null;
  saveCachedKillSwitch: (snapshot: { enabled: boolean; checkedAt: number }) => void;
  incrementFailure: () => number;
  resetFailure: () => void;
};

type PopupPort = {
  applyKillSwitchState: (enabled: boolean) => void;
  showError: (message: string) => void;
};

type KillSwitchSuccess = { ok: true; result: { enabled: boolean; source: 'cache' | 'remote' } };
type KillSwitchFailure = { ok: false; error: string; result: { enabled: boolean; failures: number } };

/**
 * 想定する JSON 応答の形:
 * - 成功時: { ok: true, result: { enabled: boolean, source: 'cache' | 'remote' } }
 * - 失敗時: { ok: false, error: string, result: { enabled: boolean, failures: number } }
 */

describe('UC2: Kill switch 初期化（雛形）', () => {
  it('normal', async () => {
    // TODO: キャッシュが更新され UI が反映される成功パターンを確認する
  });

  it('edge', async () => {
    // TODO: キャッシュが期限切れのときにリモートを呼び出す境界パターンを確認する
  });

  it('invalid', async () => {
    // TODO: リモート呼び出しが連続で失敗した場合の失敗応答とリトライ制御を確認する
  });
});

// 高校生向けレビュー: 顧問の先生に活動許可をもらってから部活を始め、
// 返事が遅いときは何度か確認し、それでもダメなら「今日は中止」と全員へ伝える流れを想定しています。
