/**
 * アプリケーションの主要な層の間でやり取りする共通契約をまとめています。
 * 各層が守るべき約束事を明示し、初めて読んだ人でも役割が理解できるよう解説しています。
 */
export interface UseCase<Request, Response> {
  /**
   * ユーザー操作やスケジュールに応じて、アプリケーションの中心となる処理を実行します。
   *
   * @param request - 入力データ。フォームの内容や API からの値などをまとめて渡します。
   * @returns 処理結果を Promise で返します。成功時には Response 型の値が含まれます。
   * @throws Error - 前提条件を満たしていない、外部サービスが失敗したなど、処理が進められない場合に発生します。
   */
  execute(request: Request): Promise<Response>;
}
