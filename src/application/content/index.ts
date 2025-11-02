/**
 * コンテンツスクリプトが提供する機能の最小セットを示す契約です。
 * ブラウザー画面上で直接動作するため、表示操作や通信の流れをコメントで説明しています。
 */
export interface ContentScript {
  /**
   * 拡張機能の表示準備を行い、必要な要素を配置します。
   *
   * @returns 準備が整ったことを示す Promise。成功時に追加の値は返しません。
   * @throws Error - DOM へのアクセスが拒否された場合や必須データが取得できなかった場合に発生します。
   */
  initialize(): Promise<void>;

  /**
   * 新しい商品データを受け取り、画面を更新します。
   *
   * @param summary - いいね情報など、描画に必要なデータ。null を渡すことは想定していません。
   * @returns 画面更新が完了したことを示す Promise。追加の戻り値は不要です。
   * @throws Error - DOM 更新に失敗した場合やテンプレートが破損している場合に発生します。
   */
  render(summary: unknown): Promise<void>;
}
