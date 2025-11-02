/**
 * いいね情報に関する値オブジェクトをまとめた型定義です。
 * メルカリ検索結果に関心がある高校生にも伝わるよう、単語はできるだけ平易にしています。
 */
export interface LikeSummary {
  /**
   * 特定の商品ページを一意に判定するための文字列です。
   * 例として「item123」のような固有の ID が入り、未設定のケースは許されません。
   */
  readonly listingId: string;

  /**
   * 取得した時点で表示されている合計いいね数です。
   * 値が 0 の場合は、まだ誰もお気に入り登録していないことを意味します。
   */
  readonly totalLikes: number;

  /**
   * いいね情報を取得した時刻を協定世界時 (UTC) の ISO 8601 文字列で表現します。
   * 未取得状態と混同しないため、常に厳密な日時文字列を格納します。
   */
  readonly fetchedAt: string;
}

/**
 * いいね情報を取得・更新するためのリポジトリ契約です。
 * 実装はブラウザー API や外部サービスを利用しても構いませんが、ここでは型定義のみ提供します。
 */
export interface LikesRepository {
  /**
   * 指定した商品 ID の最新いいね情報を取得します。
   *
   * @param listingId - 情報を集めたい商品 ID。空文字や null を渡すことは許容されません。
   * @returns 商品 ID・いいね数・取得時刻を含む情報が Promise で返ります。
   * @throws Error - ネットワーク断やアクセス制限、レスポンスがタイムアウトした場合、または取得したデータが無効な場合に発生します。
   */
  fetchByListingId(listingId: string): Promise<LikeSummary>;

  /**
   * 取得済みのいいね情報を保存し、後から読み返せるようにします。
   *
   * @param summary - 保存対象となるいいね情報。listingId が一致しないものは受け付けません。
   * @returns 保存処理が完了したことを示す Promise が返ります。中身の値は必要ありません。
   * @throws Error - 保存先の容量不足や権限不足、書き込み中のタイムアウト、または summary の整合性が取れない場合に発生します。
   */
  store(summary: LikeSummary): Promise<void>;
}
