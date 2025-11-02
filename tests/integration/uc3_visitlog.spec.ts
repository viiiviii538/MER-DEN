/**
 * UC3: 取引ログ送信の結合テスト雛形です。
 * 送信の重複判定と失敗時の即エラー化ルールをモックで確認する予定です。
 */

// Jest の import 解決は既存の相対パスで十分なことを確認しました。
// 後続 PR では `require('../../src/...')` を追加するだけで動作するため、
// 設定変更が不要である点をコメントして開発の足場を共有します。

type RuntimePort = {
  onMessage: (handler: (message: unknown) => Promise<unknown>) => void;
  sendMessage: (message: unknown) => Promise<unknown>;
};

type NetworkPort = {
  postVisitLog: (entry: { signature: string; payload: unknown }) => Promise<{ ok: boolean; deduped?: boolean; error?: string }>;
};

type StoragePort = {
  getLastSignature: () => { signature: string; timestamp: number } | null;
  saveLastSignature: (entry: { signature: string; timestamp: number }) => void;
};

type PopupPort = {
  notifySuccess: (message: string) => void;
  notifyFailure: (message: string) => void;
};

type VisitLogSuccess = { ok: true; deduped: boolean };
type VisitLogFailure = { ok: false; error: string };

/**
 * 想定する JSON 応答の形:
 * - 成功時: { ok: true, deduped: boolean }
 * - 失敗時: { ok: false, error: string }
 */

describe('UC3: Visit log 送信（雛形）', () => {
  it('normal', async () => {
    // TODO: 初回送信で postVisitLog が呼ばれ、成功レスポンスになるシナリオを検証する
  });

  it('edge', async () => {
    // TODO: 直近署名と一致する場合に deduped:true で早期終了するシナリオを検証する
  });

  it('invalid', async () => {
    // TODO: postVisitLog がエラー応答を返した場合のエラーハンドリングを検証する
  });
});

// 高校生向けレビュー: 同じ提出物は 1 回だけ出し、先生が受け取れなかったらすぐ報告する、
// そんな真面目な提出ルールをテストで表現する練習です。
