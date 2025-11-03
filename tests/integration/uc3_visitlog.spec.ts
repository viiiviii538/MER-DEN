/**
 * UC3: 検索履歴をポップアップへ表示する結合テストの雛形です。
 * 後続タスクでは visit log API とローカル保存の連携を検証します。
 */

// Jest 設定はデフォルトのままで、<rootDir> 直下にあるファイルへ相対パスでアクセスできます。
// ここでは設定変更が不要である点をコメントして開発の足場を共有します。

/**
 * @typedef {Object} RuntimePort
 * @property {(handler: (message: unknown) => Promise<unknown>) => void} onMessage
 *   ポップアップから届く「新しい検索結果を見せて」の声を受け止めます。
 * @property {(message: unknown) => Promise<unknown>} sendMessage
 *   背景ページへ指示を届ける連絡係です。
 */

/**
 * @typedef {Object} VisitLogEntry
 * @property {string} keyword 検索キーワード
 * @property {number} visitedAt 検索した時間（UNIX 時間）
 */

/**
 * @typedef {Object} VisitLogPort
 * @property {() => Promise<VisitLogEntry[]>} loadRecentKeywords
 *   保存済みの検索履歴を取得します。
 * @property {(entry: VisitLogEntry) => Promise<void>} saveKeyword
 *   新しい検索結果を保存します。
 */

/**
 * @typedef {Object} PopupPort
 * @property {(entries: VisitLogEntry[]) => void} renderVisitLog
 *   取得した履歴をリスト表示します。
 * @property {(message: string) => void} showEmptyNotice
 *   履歴が無い場合に励ましのメッセージを表示します。
 */

/** @typedef {{ ok: true, keywords: VisitLogEntry[] }} VisitLogSuccess */
/** @typedef {{ ok: false, error: string }} VisitLogFailure */

/**
 * 想定する JSON 応答の形:
 * - 成功時: { ok: true, keywords: VisitLogEntry[] }
 * - 失敗時: { ok: false, error: string }
 */

describe('UC3: visit log 取得（雛形）', () => {
  it('normal', async () => {
    // TODO: visit log が存在するときに renderVisitLog が呼ばれることを検証する
  });

  it('edge', async () => {
    // TODO: 履歴が空のときに showEmptyNotice が呼ばれることを検証する
  });

  it('invalid', async () => {
    // TODO: loadRecentKeywords が失敗した場合にエラー応答を返すことを検証する
  });
});

// 高校生向けレビュー: みんなの図書室利用記録をまとめて掲示板に貼り出し、
// 本が借りられていないときは「次に借りる人募集中！」と声をかけるイメージです。
