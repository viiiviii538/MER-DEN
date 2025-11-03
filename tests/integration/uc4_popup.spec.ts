/**
 * UC4: ポップアップ UI の表示制御を確認する結合テスト雛形です。
 * 背景スクリプトとポップアップ間の通信を段階的に検証できるよう準備しています。
 */

// Jest のデフォルト設定（<rootDir> がプロジェクト直下）を利用しており、
// 追加のトランスパイル設定なしで require を使えることを共有します。

/**
 * @typedef {Object} RuntimePort
 * @property {(handler: (message: unknown) => Promise<unknown>) => void} onMessage
 *   背景ページからポップアップへ届く通知を受け付けます。
 * @property {(message: unknown) => Promise<unknown>} sendMessage
 *   ポップアップから背景ページへリクエストを届ける手紙係です。
 */

/**
 * @typedef {Object} PopupViewModel
 * @property {string} keyword 現在の検索キーワード
 * @property {number} likeCount 取得した ♥ 数
 * @property {boolean} killSwitchEnabled キルスイッチの ON/OFF
 */

/**
 * @typedef {Object} PopupPort
 * @property {(viewModel: PopupViewModel) => void} render
 *   UI の状態を描画します。
 * @property {(message: string) => void} showError
 *   利用者へわかりやすいエラーを表示します。
 */

/**
 * @typedef {Object} KillSwitchPort
 * @property {() => Promise<boolean>} fetchKillSwitchState
 *   現在のキルスイッチ状態を問い合わせます。
 */

/** @typedef {{ ok: true, viewModel: PopupViewModel }} PopupSuccess */
/** @typedef {{ ok: false, error: string }} PopupFailure */

/**
 * 想定する JSON 応答の形:
 * - 成功時: { ok: true, viewModel: PopupViewModel }
 * - 失敗時: { ok: false, error: string }
 */

describe('UC4: popup 表示（雛形）', () => {
  it('normal', async () => {
    // TODO: render が呼ばれてバッジ情報が反映される正常ケースを検証する
  });

  it('edge', async () => {
    // TODO: killSwitchEnabled が true のときに警告表示が出る境界ケースを検証する
  });

  it('invalid', async () => {
    // TODO: fetchKillSwitchState が失敗した場合に showError が呼ばれることを検証する
  });
});

// 高校生向けレビュー: 文化祭の案内板を作る係が、倉庫係（背景処理）と連絡を取りながら表示内容を更新する練習です。
