/**
 * ポップアップ画面の操作をまとめる契約です。
 * 画面表示の流れやエラー時の考え方を丁寧に説明しています。
 */
export interface PopupController {
  /**
   * ポップアップが開かれた際に初期データを読み込みます。
   *
   * @returns 画面準備が完了したことを示す Promise。
   * @throws Error - 保存データの読み込みに失敗した場合や、必要な API が利用できない場合に発生します。
   */
  loadInitialState(): Promise<void>;

  /**
   * 利用者がボタンを押したときなどに呼び出されるアクションです。
   *
   * @param actionName - 押されたボタン名など、実行したい操作を示す文字列。
   * @returns 操作が完了したことを示す Promise。
   * @throws Error - 操作に必要な権限が不足している、または通信に失敗した場合に発生します。
   */
  handleAction(actionName: string): Promise<void>;
}
