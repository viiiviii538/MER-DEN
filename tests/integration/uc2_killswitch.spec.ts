/**
 * UC2: キルスイッチ制御の結合テスト雛形です。
 * ここではリモート問い合わせとローカルキャッシュの最小フローをモックで再現する予定です。
 */

// Jest の設定は package.json に記載されたデフォルト値（<rootDir> = プロジェクト直下）のままです。
// 後続 PR では `require('../../src/...')` の相対 import を追加するだけで結合テストを書けるため、
// ここではその前提をコメントとして残しておきます。

/**
 * @typedef {Object} RuntimePort
 * @property {(handler: (message: unknown) => Promise<unknown>) => void} onMessage
 *   拡張機能の背景ページへメッセージを届ける際の「受け付け窓口」です。
 * @property {(message: unknown) => Promise<unknown>} sendMessage
 *   背景ページにリクエストを届ける宅配便の役割を果たします。
 */

/**
 * @typedef {Object} NetworkPort
 * @property {() => Promise<{ enabled: boolean }>} fetchKillSwitchFromRemote
 *   リモート API へ問い合わせてキルスイッチの状態を取得します。
 */

/**
 * @typedef {Object} StoragePort
 * @property {() => { enabled: boolean, checkedAt: number } | null} getCachedKillSwitch
 *   直近の問い合わせ結果を取り出します。高校生向けレビュー: 学級日誌を読み返すイメージです。
 * @property {(snapshot: { enabled: boolean, checkedAt: number }) => void} saveCachedKillSwitch
 *   取得した結果を保存して次回に備えます。
 * @property {() => number} incrementFailure
 *   連続失敗回数を数え上げます。
 * @property {() => void} resetFailure
 *   成功したら失敗回数をリセットします。
 */

/**
 * @typedef {Object} PopupPort
 * @property {(enabled: boolean) => void} applyKillSwitchState
 *   キルスイッチ状態をポップアップへ反映させます。
 * @property {(message: string) => void} showError
 *   失敗時に利用者へ丁寧なメッセージを伝えます。
 */

/** @typedef {{ ok: true, result: { enabled: boolean, source: 'cache' | 'remote' } }} KillSwitchSuccess */
/** @typedef {{ ok: false, error: string, result: { enabled: boolean, failures: number } }} KillSwitchFailure */

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
