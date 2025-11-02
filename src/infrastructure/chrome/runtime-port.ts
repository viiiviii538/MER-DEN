/**
 * Chrome 拡張の Runtime Port を表す契約です。
 * 実際の通信路の動きをイメージできるよう、送受信の流れとタイムアウト時の注意点を明記しています。
 */
export interface RuntimePort<Message> {
  /**
   * ポートに対してメッセージを送信します。
   *
   * @param payload - 拡張間で共有したいデータ。JSON へ変換できる内容を前提とします。
   * @throws Error - 通信チャネルが切断されている、または送信中にタイムアウトした場合に発生します。
   */
  postMessage(payload: Message): void;

  /**
   * 外部から届いたメッセージを購読するためのイベントハンドラーを登録します。
   *
   * @param listener - 受信時に呼び出される関数。未定義のメッセージを受け取った場合は実装側で安全に扱ってください。
   * @throws Error - リスナー登録に失敗した場合や、ポートがすでに切断されている場合に発生します。
   */
  addListener(listener: (message: Message) => void): void;

  /**
   * 使い終わったポートを閉じ、リソースを解放します。
   * タイムアウト待ちが残っているときは、実装側で安全にキャンセルしてから閉じてください。
   */
  disconnect(): void;
}
