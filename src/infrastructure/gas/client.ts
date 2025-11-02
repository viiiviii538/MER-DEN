/**
 * Google Apps Script (GAS) と連携するための通信契約です。
 * 高校生でも分かるよう、スプレッドシートへ記録するイメージを例に説明しています。
 */
export interface GasClient<Request, Response> {
  /**
   * GAS 側の公開 Web API にリクエストを送信します。
   *
   * @param payload - 送信したい内容。GAS で処理できる JSON 形式を想定しています。
   * @returns GAS から返ってきた結果を Promise で受け取ります。
   * @throws Error - 通信がタイムアウトした場合や、GAS がエラーを返した場合に発生します。
   */
  invoke(payload: Request): Promise<Response>;
}
