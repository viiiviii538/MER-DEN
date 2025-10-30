/**
 * Chrome 拡張で実際に利用している API 群を型付けする宣言ファイルです。
 * テストコードからも型安全に参照できるよう最小限の表現に絞っています。
 */
interface Chrome {
  /** Chrome Runtime API へのアクセスを提供します。 */
  readonly runtime: ChromeRuntime;
  /** アクティブなタブ操作に利用する Tabs API へのアクセスを提供します。 */
  readonly tabs: ChromeTabs;
  /** 設定値などを保存する Storage API へのアクセスを提供します。 */
  readonly storage?: ChromeStorage;
  /** バックグラウンドでの定期処理に利用する Alarms API へのアクセスを提供します。 */
  readonly alarms?: ChromeAlarms;
  /** DOM へのスクリプト注入に利用する Scripting API へのアクセスを提供します。 */
  readonly scripting: ChromeScripting;
}

/**
 * Runtime API のメッセージ送受信を表現します。
 */
interface ChromeRuntime {
  /** 指定したメッセージを対象へ送り、レスポンスを Promise で受け取ります。 */
  sendMessage(message: MerHelperMessage): Promise<MerHelperResponse>;
  /** メッセージ受信時に発火するイベントを提供します。 */
  readonly onMessage: ChromeRuntimeMessageEvent;
}

/**
 * Runtime API のメッセージ受信イベントを表現します。
 */
interface ChromeRuntimeMessageEvent {
  /** 受信したメッセージを処理するリスナーを登録します。 */
  addListener(listener: ChromeRuntimeMessageListener): void;
  /** 登録済みのリスナーを解除します。 */
  removeListener(listener: ChromeRuntimeMessageListener): void;
}

/**
 * Runtime API で利用するメッセージリスナーのシグネチャを表現します。
 */
type ChromeRuntimeMessageListener = (
  message: MerHelperMessage,
  sender: ChromeRuntimeMessageSender,
  sendResponse: (response: MerHelperResponse) => void
) => void;

/**
 * Runtime API のメッセージ送信元情報を表現します。
 */
interface ChromeRuntimeMessageSender {
  /** メッセージ送信元のタブ情報です。 */
  readonly tab?: ChromeTab | null;
  /** メッセージ送信元のフレーム ID です。 */
  readonly frameId?: number;
  /** メッセージ送信元の拡張 ID です。 */
  readonly id?: string;
  /** メッセージ送信元の URL です。 */
  readonly url?: string;
}

/**
 * Tabs API の機能を表現します。
 */
interface ChromeTabs {
  /** 現在のウィンドウでアクティブなタブなどを検索します。 */
  query(queryInfo: ChromeTabsQueryInfo): Promise<ChromeTab[]>;
  /** 指定したタブ ID にメッセージを送信します。 */
  sendMessage(tabId: number, message: MerHelperMessage): Promise<MerHelperResponse>;
  /** 新しいタブを作成します。 */
  create(createProperties: ChromeTabsCreateProperties): Promise<ChromeTab>;
  /** 指定したタブを閉じます。 */
  remove(tabId: number): Promise<void>;
  /** タブ更新時に発火するイベントを提供します。 */
  readonly onUpdated: ChromeTabsUpdatedEvent;
}

/**
 * Tabs API の検索条件を表現します。
 */
interface ChromeTabsQueryInfo {
  /** 現在アクティブなタブのみを対象にするかを示します。 */
  readonly active?: boolean;
  /** 現在のウィンドウに限定するかを示します。 */
  readonly currentWindow?: boolean;
}

/**
 * Tabs API で扱うタブ情報を表現します。
 */
interface ChromeTab {
  /** タブを一意に識別する ID です。 */
  readonly id?: number;
  /** タブに表示されている URL です。 */
  readonly url?: string;
  /** 読み込み状況を示すステータスです。 */
  readonly status?: 'loading' | 'complete' | string;
}

/**
 * 新しいタブを生成する際の設定値を表現します。
 */
interface ChromeTabsCreateProperties {
  /** 開く URL を指定します。 */
  readonly url: string;
  /** タブをアクティブにするかどうかを指定します。 */
  readonly active?: boolean;
}

/**
 * タブの更新イベントを表現します。
 */
interface ChromeTabsUpdatedEvent {
  /** 更新イベント発生時に呼び出されるリスナーを登録します。 */
  addListener(listener: ChromeTabsUpdatedListener): void;
  /** 登録済みのリスナーを解除します。 */
  removeListener(listener: ChromeTabsUpdatedListener): void;
}

/**
 * タブ更新イベントで利用するリスナーのシグネチャを表現します。
 */
type ChromeTabsUpdatedListener = (
  tabId: number,
  changeInfo: ChromeTabsChangeInfo,
  tab: ChromeTab
) => void;

/**
 * タブ更新時の変更内容を表現します。
 */
interface ChromeTabsChangeInfo {
  /** タブの読み込み状態です。 */
  readonly status?: 'loading' | 'complete' | string;
  /** タブの URL です。 */
  readonly url?: string;
}

/**
 * Storage API へのアクセスを表現します。
 */
interface ChromeStorage {
  /** 拡張内で永続化に利用する領域です。 */
  readonly local?: ChromeStorageArea;
}

/**
 * Storage API のローカル領域を表現します。
 */
interface ChromeStorageArea {
  /** 指定したキーに保存された値を取得します。 */
  get(key: string): Promise<Record<string, unknown>>;
  /** 指定したオブジェクトを保存します。 */
  set(items: Record<string, unknown>): Promise<void>;
}

/**
 * Alarms API の機能を表現します。
 */
interface ChromeAlarms {
  /** 指定した名前でアラームを作成します。 */
  create(name: string, alarmInfo: ChromeAlarmCreateInfo): void;
  /** アラーム発火時に通知されるイベントです。 */
  readonly onAlarm: ChromeAlarmEvent;
}

/**
 * アラームを作成する際のオプションを表現します。
 */
interface ChromeAlarmCreateInfo {
  /** 次回までの遅延時間（分）です。 */
  readonly delayInMinutes?: number;
  /** 周期的に発火させる間隔（分）です。 */
  readonly periodInMinutes?: number;
  /** 特定時刻での発火を指定する Unix 時間です。 */
  readonly when?: number;
}

/**
 * アラーム発火時に渡される情報を表現します。
 */
interface ChromeAlarm {
  /** アラームを識別する名前です。 */
  readonly name?: string;
  /** スケジュールされた時刻のタイムスタンプです。 */
  readonly scheduledTime?: number;
  /** 周期アラームの場合のインターバル（分）です。 */
  readonly periodInMinutes?: number;
}

/**
 * アラーム発火イベントを表現します。
 */
interface ChromeAlarmEvent {
  /** アラーム発火時に呼び出すリスナーを登録します。 */
  addListener(listener: (alarm: ChromeAlarm) => void): void;
  /** 登録済みのリスナーを解除します。 */
  removeListener(listener: (alarm: ChromeAlarm) => void): void;
}

/**
 * Scripting API を用いたスクリプト注入の操作を表現します。
 */
interface ChromeScripting {
  /** 指定したタブにスクリプトを注入し、結果を取得します。 */
  executeScript(options: ChromeScriptingExecuteScriptOptions): Promise<ChromeScriptingInjectionResult[]>;
}

/**
 * executeScript に渡すオプションを表現します。
 */
interface ChromeScriptingExecuteScriptOptions {
  /** 注入先タブやフレームを指定します。 */
  readonly target: {
    /** 注入対象のタブ ID です。 */
    readonly tabId: number;
    /** 注入対象のフレーム ID 群です。 */
    readonly frameIds?: readonly number[];
    /** すべてのフレームへ注入するかどうかです。 */
    readonly allFrames?: boolean;
  };
  /** 実行するワールド（DOM との隔離レベル）を指定します。 */
  readonly world?: 'ISOLATED' | 'MAIN';
  /** 注入して実行する関数本体です。 */
  readonly func: (...args: readonly unknown[]) => unknown;
  /** 関数に渡す引数です。 */
  readonly args?: readonly unknown[];
}

/**
 * スクリプト注入の結果を表現します。
 */
interface ChromeScriptingInjectionResult {
  /** 実行結果の値です。 */
  readonly result?: unknown;
  /** 実行が行われたフレーム ID です。 */
  readonly frameId?: number;
}

/**
 * 拡張機能内で共有するメッセージ全体の集合です。
 */
type MerHelperMessage = MerHelperBackgroundMessage | MerHelperContentMessage;

/**
 * バックグラウンドページへ送信するメッセージ群です。
 */
type MerHelperBackgroundMessage =
  | MerHelperGetKillSwitchStatusMessage
  | MerHelperBgScrapeLikeMessage
  | MerHelperLogPageVisitMessage;

/**
 * キルスイッチ状態を問い合わせるメッセージです。
 */
interface MerHelperGetKillSwitchStatusMessage {
  /** メッセージの対象スコープを示す固定値です。 */
  readonly scope: 'mer-helper';
  /** 要求する操作種別です。 */
  readonly type: 'getKillSwitchStatus';
  /** キャッシュを無視して取得するかどうかです。 */
  readonly force?: boolean;
}

/**
 * 背景側で DOM スクレイプを実行し、♥数を取得するメッセージです。
 */
interface MerHelperBgScrapeLikeMessage {
  /** メッセージの対象スコープを示す固定値です。 */
  readonly scope: 'mer-helper';
  /** 要求する操作種別です。 */
  readonly type: 'bgScrapeLike';
  /** スクレイプ対象ページの URL です。 */
  readonly url: string;
}

/**
 * ページ訪問ログを送信するメッセージです。
 */
interface MerHelperLogPageVisitMessage {
  /** メッセージの対象スコープを示す固定値です。 */
  readonly scope: 'mer-helper';
  /** 要求する操作種別です。 */
  readonly type: 'logPageVisit';
  /** 記録対象となる訪問ログの内容です。 */
  readonly entry: MerHelperLogEntry;
}

/**
 * コンテンツスクリプトへ送信するメッセージ群です。
 */
type MerHelperContentMessage =
  | MerHelperPingMessage
  | MerHelperToggleOverlayMessage
  | MerHelperScanMessage;

/**
 * 疎通確認のための ping メッセージです。
 */
interface MerHelperPingMessage {
  /** メッセージの対象スコープを示す固定値です。 */
  readonly scope: 'mer-helper';
  /** 要求する操作種別です。 */
  readonly type: 'ping';
}

/**
 * オーバーレイ表示の ON/OFF を切り替えるメッセージです。
 */
interface MerHelperToggleOverlayMessage {
  /** メッセージの対象スコープを示す固定値です。 */
  readonly scope: 'mer-helper';
  /** 要求する操作種別です。 */
  readonly type: 'toggleOverlay';
}

/**
 * 商品一覧の再集計を要求するメッセージです。
 */
interface MerHelperScanMessage {
  /** メッセージの対象スコープを示す固定値です。 */
  readonly scope: 'mer-helper';
  /** 要求する操作種別です。 */
  readonly type: 'scan';
  /** 集計の実行モードなどを指定します。 */
  readonly payload?: MerHelperScanRequest;
}

/**
 * 集計処理の実行条件を表現します。
 */
interface MerHelperScanRequest {
  /** 画面をスクロールして全件を対象にするかどうかです。 */
  readonly mode?: 'view' | 'all';
  /** 売り切れ商品のみを集計対象にするかどうかです。 */
  readonly soldOnly?: boolean;
  /** ♥バッジの描画を行うかどうかです。 */
  readonly showBadges?: boolean;
}

/**
 * 集計結果のサマリーを表現します。
 */
interface MerHelperScanResult {
  /** 販売中商品の件数です。 */
  readonly activeCount: number;
  /** 売り切れ商品の件数です。 */
  readonly soldCount: number;
  /** 集計対象で見つかった最小価格です。 */
  readonly minPrice: number | null;
  /** 集計対象で見つかった最大価格です。 */
  readonly maxPrice: number | null;
  /** 処理した商品の件数です。 */
  readonly totalParsed: number;
  /** 売り切れ商品のみを対象にしたかどうかです。 */
  readonly soldOnly: boolean;
}

/**
 * ページ訪問ログの 1 件分を表現します。
 */
interface MerHelperLogEntry {
  /** 訪問したページの URL です。 */
  readonly url: string;
  /** 訪問ページの種類を示します。 */
  readonly pageType: 'mypage-sold' | 'transaction-detail' | 'mypage-transaction' | string;
  /** 商品 ID を保持している場合に指定します。 */
  readonly itemId?: string | null;
  /** 商品タイトルを保持している場合に指定します。 */
  readonly title?: string;
  /** 価格情報を保持している場合に指定します。 */
  readonly price?: number;
  /** 価格に対応する通貨コードです。 */
  readonly currency?: string;
  /** 成約日時などの文字列表現です。 */
  readonly soldAt?: string;
  /** ドキュメントタイトルを保持している場合に指定します。 */
  readonly documentTitle?: string;
  /** ログ取得時刻を ISO 8601 形式で指定します。 */
  readonly loggedAt?: string;
}

/**
 * キルスイッチの最新状態を表現します。
 */
interface MerHelperKillSwitchStatus {
  /** 機能が有効になっているかどうかです。 */
  readonly enabled: boolean;
  /** 最終確認時刻（ミリ秒）です。 */
  readonly lastChecked: number;
  /** 最終成功時刻（ミリ秒）です。 */
  readonly lastSuccess: number;
  /** 情報の取得元を示します。 */
  readonly source: 'memory' | 'remote' | 'error';
}

/**
 * メッセージ送受信で利用する全てのレスポンス型を表現します。
 */
type MerHelperResponse =
  | MerHelperKillSwitchStatusResponse
  | MerHelperBgScrapeLikeResponse
  | MerHelperLogPageVisitResponse
  | MerHelperPingResponse
  | MerHelperToggleOverlayResponse
  | MerHelperScanResponse
  | MerHelperErrorResponse;

/**
 * キルスイッチ問い合わせに対するレスポンスです。
 */
interface MerHelperKillSwitchStatusResponse {
  /** 成功したことを示す固定値です。 */
  readonly ok: true;
  /** キルスイッチの状態です。 */
  readonly result: MerHelperKillSwitchStatus;
}

/**
 * ♥数スクレイプ結果のレスポンスです。
 */
interface MerHelperBgScrapeLikeResponse {
  /** 成功したことを示す固定値です。 */
  readonly ok: true;
  /** 取得した ♥ 数です。 */
  readonly value: number | null;
}

/**
 * ページ訪問ログ送信時のレスポンスです。
 */
interface MerHelperLogPageVisitResponse {
  /** 成功したことを示す固定値です。 */
  readonly ok: true;
  /** 直近で同一内容を送信済みかどうかです。 */
  readonly deduped?: boolean;
}

/**
 * ping メッセージに対するレスポンスです。
 */
interface MerHelperPingResponse {
  /** 成功したことを示す固定値です。 */
  readonly ok: true;
  /** 応答内容を示す固定値です。 */
  readonly result: 'pong';
}

/**
 * オーバーレイ切り替えに対するレスポンスです。
 */
interface MerHelperToggleOverlayResponse {
  /** 成功したことを示す固定値です。 */
  readonly ok: true;
  /** 操作結果を示す固定値です。 */
  readonly result: true;
}

/**
 * 集計要求に対するレスポンスです。
 */
interface MerHelperScanResponse {
  /** 成功したことを示す固定値です。 */
  readonly ok: true;
  /** 集計結果のサマリーです。 */
  readonly result: MerHelperScanResult;
}

/**
 * エラーやキルスイッチ無効化時のレスポンスです。
 */
interface MerHelperErrorResponse {
  /** 失敗したことを示す固定値です。 */
  readonly ok: false;
  /** キルスイッチなどによって拒否された場合のフラグです。 */
  readonly disabled?: boolean;
  /** エラー内容を表すメッセージです。 */
  readonly error?: string;
}

declare global {
  /** Chrome 拡張環境で提供されるグローバル chrome オブジェクトです。 */
  const chrome: Chrome;
}

export {};
