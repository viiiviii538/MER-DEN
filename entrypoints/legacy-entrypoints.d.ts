/**
 * @packageDocumentation
 * 既存の JavaScript エントリーポイント（content.js / background.js / popup.js）を
 * TypeScript から安全に呼び出すための橋渡し宣言です。
 * 直接移植する前に型だけ整えて、段階的にリファクタリングできるようにしています。
 * 高校生向け補足: 古い機械に最新のリモコンをつなぐ延長コードを作っているイメージです。
 */

import type {
  ChromeMessageSender,
  MerHelperMessage,
  MerHelperResponse,
  MerHelperScanOptions,
  MerHelperScanResult
} from '../tests/types/chrome';

// @ts-ignore -- TypeScript は相対パスの ambient module を直接認めないが、実ファイルと同じパスで橋渡しをする必要がある。
declare module '../content.js' {
  /**
   * `aggregate` に渡せるオプション。既存の JS では売り切れフラグとバッジ描画のみ扱います。
   * 高校生向け補足: 必要なスイッチだけをまとめた小さなリモコンのような設定です。
   */
  export interface MerHelperAggregateOptions {
    /** 売り切れ商品のみを対象にするかどうか。 */
    soldOnly?: boolean;
    /** 商品カードに♥バッジを描画するかどうか。 */
    showBadges?: boolean;
  }

  /**
   * `content.js` が実際に公開している関数群。
   * 高校生向け補足: コンテンツスクリプトのリモコン本体です。
   */
  export interface MerHelperContentExports {
    /** 検索結果を集計する同期処理。 */
    aggregate(options?: MerHelperAggregateOptions): MerHelperScanResult;
    /** 自動スクロールを含む集計の非同期処理。 */
    scan(options?: Partial<MerHelperScanOptions>): Promise<MerHelperScanResult>;
    /** テスト専用の裏メニュー。 */
    __private: {
      /** 検索結果ページを指定回数スクロールする。 */
      readonly autoScrollAll: (maxSteps?: number) => Promise<void>;
    };
  }

  const content: MerHelperContentExports;
  export = content;
}

// @ts-ignore -- 上記と同様に型の橋渡しをするため、明示的にモジュール名を指定する。
declare module '../background.js' {
  /**
   * キューへ投入するタスクの型。Like 取得などの非同期処理を表します。
   * 高校生向け補足: 順番待ちの整理券に紐づく「終わったら結果を教えてね」という仕事です。
   */
  export type EnqueueTask<T> = () => Promise<T> | T;

  /**
   * キューの実装と同じ関数シグネチャです。
   * 高校生向け補足: どの列に並ぶかを差し替えるためのソケット形状を表しています。
   */
  export type EnqueueImplementation = <T>(task: EnqueueTask<T>) => Promise<T | null>;

  /**
   * バックグラウンドが保持するキルスイッチ状態のスナップショット。
   * 高校生向け補足: 現在の安全装置のダッシュボードを丸ごと写したメモです。
   */
  export interface MerHelperKillSwitchInternalState {
    enabled: boolean;
    lastChecked: number;
    lastSuccess: number;
    consecutiveFailures: number;
    pending: Promise<unknown> | null;
  }

  /**
   * `background.js` の公開 API 一覧。
   * 高校生向け補足: 背景で働くスタッフの仕事メニュー表です。
   */
  export interface MerHelperBackgroundExports {
    enqueue<T>(task: EnqueueTask<T>): Promise<T | null>;
    handleRuntimeMessage(
      message: MerHelperMessage,
      sender: ChromeMessageSender,
      sendResponse: (response: MerHelperResponse) => void
    ): boolean;
    waitTabComplete(tabId: number, timeoutMs?: number): Promise<boolean>;
    scrapeLike(url: string): Promise<number | null>;
    __resetQueue(): void;
    __setEnqueueImplementation(implementation?: EnqueueImplementation): void;
    __getProcessedThisRun(): number;
    __setProcessedThisRun(value: number): void;
    __getMaxItemsPerRun(): number;
    __setKillSwitchForTests(enabled: boolean): void;
    __getKillSwitchState(): MerHelperKillSwitchInternalState;
    __clearRecentLogCache(): void;
  }

  const background: MerHelperBackgroundExports;
  export = background;
}

// @ts-ignore -- 上記と同様に型の橋渡しをするため、明示的にモジュール名を指定する。
declare module '../popup.js' {
  /**
   * `popup.js` はイベントリスナーを登録するだけで、外部へ公開する値はありません。
   * 高校生向け補足: スイッチを押したらすぐ動く装置で、部品は外から触れないイメージです。
   */
  export type MerHelperPopupExports = Record<string, never>;

  const popup: MerHelperPopupExports;
  export = popup;
}
