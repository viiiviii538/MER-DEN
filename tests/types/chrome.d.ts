/**
 * メルカリ検索支援拡張で使用するスキャンモード。
 */
export type MerHelperScanMode = 'view' | 'all';

/**
 * コンテンツスクリプトが実行する集計処理のオプション。
 */
export interface MerHelperScanOptions {
  /**
   * スクロール戦略（そのまま or すべて自動スクロール）。
   */
  mode: MerHelperScanMode;
  /**
   * 売り切れ商品のみを対象にするかどうか。
   */
  soldOnly: boolean;
  /**
   * 商品カードに♥バッジを描画するかどうか。
   */
  showBadges: boolean;
}

/**
 * 検索結果の集計結果（オーバーレイ表示やテストで使用）。
 */
export interface MerHelperScanResult {
  /**
   * 出品中商品の件数。
   */
  activeCount: number;
  /**
   * 売り切れ商品の件数。
   */
  soldCount: number;
  /**
   * 対象商品の最小価格。該当がなければ null。
   */
  minPrice: number | null;
  /**
   * 対象商品の最大価格。該当がなければ null。
   */
  maxPrice: number | null;
  /**
   * 解析に使用したカードの件数。
   */
  totalParsed: number;
  /**
   * 売り切れ商品のみを集計したかどうか。
   */
  soldOnly: boolean;
}

/**
 * 取引ページで収集したログの種類。
 */
export type MerHelperPageType =
  | 'mypage-sold'
  | 'transaction-detail'
  | 'mypage-transaction';

/**
 * 取引ページを GAS へ送る際のログエントリ。
 */
export interface MerHelperLogEntry {
  /**
   * 対象ページの URL。
   */
  url: string;
  /**
   * ページの種類。
   */
  pageType: MerHelperPageType;
  /**
   * メルカリの商品 ID（m から始まる文字列）。
   */
  itemId?: string;
  /**
   * ページで確認したタイトル。
   */
  title?: string;
  /**
   * 価格（日本円）。
   */
  price?: number;
  /**
   * 通貨。現状は常に JPY。
   */
  currency?: 'JPY';
  /**
   * 売れた日時（ISO 形式などの文字列）。
   */
  soldAt?: string;
  /**
   * ドキュメントタイトル。
   */
  documentTitle?: string;
  /**
   * 送信側で任意に付与する記録時刻。
   */
  loggedAt?: string;
}

/**
 * キルスイッチの最新状態。
 */
export interface MerHelperKillSwitchStatus {
  /**
   * 拡張機能が有効かどうか。
   */
  enabled: boolean;
  /**
   * 状態を最後に確認した時刻（UNIX ミリ秒）。
   */
  lastChecked: number;
  /**
   * 最後に成功したリモート確認時刻（UNIX ミリ秒）。
   */
  lastSuccess: number;
  /**
   * 取得元（メモリ・リモート・エラー）。
   */
  source: 'memory' | 'remote' | 'error';
}

/**
 * バックグラウンドへ like 数取得を依頼するメッセージ。
 */
export interface MerHelperBgScrapeLikeMessage {
  scope: 'mer-helper';
  type: 'bgScrapeLike';
  url: string;
}

/**
 * バックグラウンドへキルスイッチ状態を問い合わせるメッセージ。
 */
export interface MerHelperGetKillSwitchStatusMessage {
  scope: 'mer-helper';
  type: 'getKillSwitchStatus';
  force?: boolean;
}

/**
 * 取引ページのログ送信を依頼するメッセージ。
 */
export interface MerHelperLogPageVisitMessage {
  scope: 'mer-helper';
  type: 'logPageVisit';
  entry: MerHelperLogEntry;
}

/**
 * コンテンツスクリプトへオーバーレイ表示切り替えを依頼するメッセージ。
 */
export interface MerHelperToggleOverlayMessage {
  scope: 'mer-helper';
  type: 'toggleOverlay';
  payload?: Record<string, never>;
}

/**
 * コンテンツスクリプトへ集計を依頼するメッセージ。
 */
export interface MerHelperScanMessage {
  scope: 'mer-helper';
  type: 'scan';
  payload?: MerHelperScanOptions;
}

/**
 * 動作確認用の ping メッセージ。
 */
export interface MerHelperPingMessage {
  scope: 'mer-helper';
  type: 'ping';
}

/**
 * 拡張機能内部で扱うメッセージの総称。
 */
export type MerHelperMessage =
  | MerHelperBgScrapeLikeMessage
  | MerHelperGetKillSwitchStatusMessage
  | MerHelperLogPageVisitMessage
  | MerHelperToggleOverlayMessage
  | MerHelperScanMessage
  | MerHelperPingMessage;

/**
 * 背景・コンテンツ間の通信結果（成功・失敗を含む）。
 */
export interface MerHelperSuccessResponse {
  /**
   * 成功時の結果。メッセージの種類ごとに内容が変わる。
   */
  result?: 'pong' | true | MerHelperScanResult | MerHelperKillSwitchStatus;
  /**
   * いいね数スクレイプ結果。
   */
  value?: number | null;
  /**
   * 重複送信の検知フラグ。
   */
  deduped?: true;
  /**
   * 成功レスポンスにも統一的に備えておくエラー情報。
   */
  error?: string;
  /**
   * キルスイッチによる拒否を共通化したフラグ。
   */
  disabled?: boolean;
}

/**
 * エラー応答の情報。
 */
export interface MerHelperErrorResponse {
  /**
   * キルスイッチなどで拒否された場合のフラグ。
   */
  disabled?: boolean;
  /**
   * エラーメッセージ。
   */
  error?: string;
}

/**
 * 背景・コンテンツ間でやり取りする共通レスポンス。
 */
export type MerHelperResponse =
  | ({ ok: true } & MerHelperSuccessResponse)
  | ({ ok: false } & MerHelperErrorResponse);

/**
 * Chrome API の一般的なイベントリスナー。
 */
export interface ChromeEvent<Handler extends (...args: any[]) => void> {
  /**
   * リスナーを登録する。
   */
  addListener(handler: Handler): void;
  /**
   * 登録済みリスナーを解除する。
   */
  removeListener(handler: Handler): void;
}

/**
 * runtime.onMessage で使用するリスナー。
 */
export type ChromeMessageListener = (
  message: MerHelperMessage,
  sender: ChromeMessageSender,
  sendResponse: (response: MerHelperResponse) => void
) => void | boolean | Promise<void | boolean>;

/**
 * runtime.onMessage のイベント管理。
 */
export interface ChromeMessageEvent extends ChromeEvent<ChromeMessageListener> {}

/**
 * メッセージ送信元タブの簡易情報。
 */
export interface ChromeMessageSender {
  /**
   * 送信元タブ。
   */
  tab?: ChromeTab;
  /**
   * フレーム ID。
   */
  frameId?: number;
  /**
   * 送信元 URL。
   */
  url?: string;
}

/**
 * runtime API の最小限の機能セット。
 */
export interface ChromeRuntime {
  /**
   * 背景スクリプトへメッセージを送信する。
   */
  sendMessage(message: MerHelperMessage): Promise<MerHelperResponse>;
  /**
   * メッセージ受信時のイベント。
   */
  onMessage: ChromeMessageEvent;
}

/**
 * タブの状態変化通知で渡される変更情報。
 */
export interface ChromeTabChangeInfo {
  /**
   * 読み込み状態。
   */
  status?: 'loading' | 'complete' | 'unloaded';
  /**
   * 更新後の URL。
   */
  url?: string;
}

/**
 * 拡張機能が扱うタブ情報。
 */
export interface ChromeTab {
  /**
   * タブ ID。
   */
  id?: number;
  /**
   * タブの URL。
   */
  url?: string;
  /**
   * 読み込み状態。
   */
  status?: 'loading' | 'complete' | 'unloaded';
  /**
   * 任意の追加プロパティ。
   */
  [key: string]: unknown;
}

/**
 * アクティブタブ検索などで指定する条件。
 */
export interface ChromeTabQuery {
  /**
   * アクティブタブのみ取得するかどうか。
   */
  active?: boolean;
  /**
   * 現在のウィンドウに限定するかどうか。
   */
  currentWindow?: boolean;
}

/**
 * 新規タブ作成時の設定。
 */
export interface ChromeCreateProperties {
  /**
   * 開く URL。
   */
  url: string;
  /**
   * タブをアクティブ表示するかどうか。
   */
  active?: boolean;
}

/**
 * tabs.onUpdated イベントの管理。
 */
export interface ChromeTabsOnUpdatedEvent
  extends ChromeEvent<(tabId: number, changeInfo: ChromeTabChangeInfo, tab: ChromeTab) => void> {}

/**
 * tabs API の最小限の機能セット。
 */
export interface ChromeTabs {
  /**
   * 条件に合うタブを検索する。
   */
  query(queryInfo: ChromeTabQuery): Promise<ChromeTab[]>;
  /**
   * 新しいタブを開く。
   */
  create(createProperties: ChromeCreateProperties): Promise<ChromeTab>;
  /**
   * 指定したタブを閉じる。
   */
  remove(tabIds: number | number[]): Promise<void>;
  /**
   * タブ内のコンテンツスクリプトへメッセージを送る。
   */
  sendMessage(tabId: number, message: MerHelperMessage): Promise<MerHelperResponse>;
  /**
   * タブ更新イベント。
   */
  onUpdated: ChromeTabsOnUpdatedEvent;
}

/**
 * ストレージから値を取得する引数。
 */
export type ChromeStorageGetArg = string | string[] | Record<string, unknown> | undefined;

/**
 * storage.local の機能セット。
 */
export interface ChromeStorageArea {
  /**
   * キーに対応する値を取得する。
   */
  get<T extends Record<string, any> = Record<string, any>>(keys?: ChromeStorageGetArg): Promise<T>;
  /**
   * キーと値の組を保存する。
   */
  set(items: Record<string, unknown>): Promise<void>;
}

/**
 * storage API。
 */
export interface ChromeStorage {
  /**
   * ローカルストレージ領域。
   */
  local: ChromeStorageArea;
}

/**
 * アラーム情報。
 */
export interface ChromeAlarm {
  /**
   * アラーム名。
   */
  name: string;
  /**
   * 次回発火予定時刻（ミリ秒）。
   */
  scheduledTime?: number;
  /**
   * 繰り返し間隔（分）。
   */
  periodInMinutes?: number;
}

/**
 * アラーム作成時の設定。
 */
export interface ChromeAlarmCreateInfo {
  /**
   * 次回発火までの遅延（分）。
   */
  delayInMinutes?: number;
  /**
   * 繰り返し間隔（分）。
   */
  periodInMinutes?: number;
  /**
   * 発火時刻（ミリ秒）。
   */
  when?: number;
}

/**
 * アラーム API。
 */
export interface ChromeAlarms {
  /**
   * アラームを作成する。
   */
  create(name: string, alarmInfo: ChromeAlarmCreateInfo): Promise<void>;
  /**
   * アラーム発火イベント。
   */
  onAlarm: ChromeEvent<(alarm: ChromeAlarm) => void>;
}

/**
 * executeScript のターゲット指定。
 */
export interface ChromeScriptTarget {
  /**
   * 実行先タブ ID。
   */
  tabId: number;
}

/**
 * executeScript 呼び出し時の設定。
 */
export interface ChromeExecuteScriptParams<ReturnValue> {
  /**
   * 実行対象。
   */
  target: ChromeScriptTarget;
  /**
   * 実行するワールド（MAIN / ISOLATED）。
   */
  world?: 'MAIN' | 'ISOLATED';
  /**
   * 実行する関数。
   */
  func: () => ReturnValue | Promise<ReturnValue>;
}

/**
 * executeScript の結果。
 */
export interface ChromeExecutedScriptResult<ReturnValue> {
  /**
   * 実行されたフレーム ID。
   */
  frameId: number;
  /**
   * 実行結果。
   */
  result: ReturnValue;
}

/**
 * scripting API。
 */
export interface ChromeScripting {
  /**
   * タブ内で任意の関数を実行する。
   */
  executeScript<ReturnValue>(
    params: ChromeExecuteScriptParams<ReturnValue>
  ): Promise<ChromeExecutedScriptResult<ReturnValue>[]>;
}

/**
 * Chrome 拡張機能で使用する API まとめ。
 */
export interface Chrome {
  /**
   * ランタイムメッセージ API。
   */
  runtime: ChromeRuntime;
  /**
   * タブ操作 API。
   */
  tabs: ChromeTabs;
  /**
   * ストレージ API。
   */
  storage: ChromeStorage;
  /**
   * アラーム API。
   */
  alarms: ChromeAlarms;
  /**
   * scripting API。
   */
  scripting: ChromeScripting;
}

declare global {
  /**
   * Chrome 拡張機能で利用できるグローバル API オブジェクト。
   */
  var chrome: Chrome;
  namespace NodeJS {
    interface Global {
      chrome: Chrome;
    }
  }
}
