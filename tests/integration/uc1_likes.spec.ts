/**
 * UC1: いいね数を取得する結合テストの雛形です。
 * 初心者でも追えるように、登場人物と動き方をコメントで丁寧に説明します。
 * 今はポート（通信口）をすべてテスト内でモック化し、Chrome 実機を使わずに流れだけ確認します。
 */

// Jest は package.json の設定で testPathIgnorePatterns のみを指定しており、<rootDir> がプロジェクト直下のままです。
// そのため後続 PR では `require('../../src/...')` のような相対パスで既存コードをそのまま読み込めることを確認済みで、
// ここでは import 設定に手を入れずに済む足場であると明示しておきます。

type RuntimePort = {
  onMessage: (handler: (message: unknown) => Promise<unknown>) => void;
  sendMessage: (message: unknown) => Promise<unknown>;
};

type NetworkPort = {
  openLikeDetail: (url: string) => Promise<{ tabId: number }>;
  waitForComplete: (tabId: number, timeoutMs: number) => Promise<boolean>;
  readLikeCount: (tabId: number) => Promise<number>;
  closeLikeDetail: (tabId: number) => Promise<void>;
};

type StoragePort = {
  isKillSwitchEnabled: () => boolean;
  recordLikeResult: (payload: { url: string; value: number }) => void;
};

type PopupPort = {
  updateBadgeText: (text: string) => void;
  pushToast: (text: string) => void;
};

type BgScrapeLikeSuccess = { ok: true; value: number };
type BgScrapeLikeDisabled = { ok: false; disabled: true };
type BgScrapeLikeFailure = { ok: false; error: string; reason?: string };

// TODO: RuntimePort・NetworkPort・StoragePort・PopupPort のモック生成関数を追加する
// TODO: mountBackgroundLikeHandler を実装し、RuntimePort と各ポートの連携を再現する

/**
 * 後続 PR では bgScrapeLike メッセージに応じた JSON 応答を検証します。
 * - 成功時: { ok: true, value: number }
 * - キルスイッチ無効: { ok: false, disabled: true }
 * - 失敗時: { ok: false, error: string, reason?: string }
 */

describe('UC1: bgScrapeLike 連携（雛形）', () => {
  it('normal', async () => {
    // TODO: モック化したポートを組み合わせて成功レスポンスを検証する
  });

  it('edge', async () => {
    // TODO: waitForComplete が false を返すなどの境界挙動を検証する
  });

  it('invalid', async () => {
    // TODO: 想定外のメッセージが届いたときにエラー応答になることを検証する
  });
});

// 高校生向けレビュー: 友達から「♥ 数を教えて」と頼まれたら、許可を確かめてからページを開き、
// 結果をメモして報告する、うまくいかなければ理由を伝えるという役割分担の予行演習です。
