/**
 * テストで利用するダミーオブジェクトやモックを表現するための型です。
 * 目的を理解しやすいよう、どのような場面で使うかを明確に記述しています。
 */
export interface TestDoubleFactory<TDependency> {
  /**
   * 依存を差し替えるためのテスト用インスタンスを生成します。
   *
   * @param overrides - 個別に変更したい振る舞い。必要な部分だけを指定することを想定しています。
   * @returns テストで利用できる依存オブジェクトを返します。
   * @throws Error - 必須プロパティが欠けており、テストダブルを組み立てられない場合に発生します。
   */
  create(overrides?: Partial<TDependency>): TDependency;
}
