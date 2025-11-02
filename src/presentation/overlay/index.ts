/**
 * 画面上に表示するオーバーレイの見た目と振る舞いをまとめたビューモデルです。
 * 何を表示するのかを文章で説明し、高校生でも雰囲気が伝わるようにしています。
 */
export interface OverlayViewModel {
  /**
   * いいね数など、オーバーレイに表示する文字列です。
   */
  readonly headline: string;

  /**
   * 補足説明や小さな文字で伝えたい情報です。例: 更新時刻など。
   */
  readonly description?: string;

  /**
   * 画面で強調したい場合に使用する色コードです。未指定なら既定の色を使います。
   */
  readonly accentColor?: string;
}

/**
 * オーバーレイ表示を司るプレゼンターの契約です。
 * データを受け取り、表示用のビューモデルへ変換する責務を説明しています。
 */
export interface OverlayPresenter {
  /**
   * 画面に表示するためのビューモデルを作成します。
   *
   * @param summary - ドメイン層から渡される商品情報。未定義の値を渡すとエラーになる想定です。
   * @returns ビューモデルを含む Promise。同期的に計算できる場合でも Promise を返して統一します。
   * @throws Error - データ形式が想定と異なる場合、テンプレート生成に失敗した場合、または描画準備がタイムアウトした場合に発生します。
   * @remarks `summary` は `unknown` 型で受け取り、プレゼンター実装が型ガードを行うことを前提としています。
   */
  present(summary: unknown): Promise<OverlayViewModel>;
}
