/**
 * 拡張機能で測定したい数値を表すイベントの型です。
 * 何を集計しているのかが初学者にも伝わるよう、項目名をストレートに表現しています。
 */
export interface MetricEvent {
  /**
   * 計測対象の名前です。例: 'overlay_displayed' などの英単語を想定しています。
   */
  readonly name: string;

  /**
   * 計測が行われた時刻を ISO 8601 形式で記録します。
   */
  readonly occurredAt: string;

  /**
   * 追加で送りたい数字データです。アクセス数や滞在時間など、数値で表せるものを扱います。
   */
  readonly value: number;

  /**
   * 付随情報を柔軟に格納するための辞書形式です。
   * たとえば画面のサイズやユーザーの操作手順などを文字列で格納できます。
   */
  readonly attributes?: Record<string, string>;
}

/**
 * 計測イベントを登録するための契約です。
 * このインターフェースを実装することで、どこへ送るかに関係なく一貫した記録方法が得られます。
 */
export interface MetricsCollector {
  /**
   * 測定イベントを受け取り、サーバーやローカルストレージへ転送します。
   *
   * @param event - 記録したいイベント。name や occurredAt が欠けている場合は受け付けません。
   * @returns 転送完了を知らせる Promise。成功時は追加のデータを返しません。
   * @throws Error - 通信のタイムアウトや保存先の容量不足で処理が中断された場合に発生します。
   */
  record(event: MetricEvent): Promise<void>;
}
