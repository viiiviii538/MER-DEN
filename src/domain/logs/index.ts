/**
 * 拡張機能内で発生した出来事を記録するための基本的な情報です。
 * メモを取る感覚で理解できるよう、項目の意味を丁寧に説明しています。
 */
export interface LogRecord {
  /**
   * いつ記録したのかを ISO 8601 形式の文字列で残します。
   * 時刻が分からないと原因調査ができないため、必ず設定されます。
   */
  readonly timestamp: string;

  /**
   * 起きた出来事の種類です。例: 'info' や 'error' など。
   * 用語は人が読んで理解できる短い単語を想定します。
   */
  readonly level: 'debug' | 'info' | 'warn' | 'error';

  /**
   * 具体的な説明文です。高校生でも状況がわかるよう、平易な日本語や英語を推奨します。
   */
  readonly message: string;

  /**
   * 追加情報が必要な場合に使用する自由形式のメタデータです。
   * JSON 化可能な値に限定し、実装側で null を使って未設定を表現しても構いません。
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * ログを集めて外部へ送信したり、ブラウザー内に保存したりする仕組みの契約です。
 * 実装の都合により非同期処理になるため、Promise を返すメソッドのみ定義します。
 */
export interface LogWriter {
  /**
   * 新しいログを受け取り、適切な出力先へ転送します。
   *
   * @param record - 記録したい情報。timestamp や level が欠けた状態は想定していません。
   * @returns 転送が完了したことを示す Promise。成功時は特別な値を返しません。
   * @throws Error - ネットワーク障害や容量制限でログを保存できなかった場合に発生します。
   */
  write(record: LogRecord): Promise<void>;
}
