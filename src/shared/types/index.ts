/**
 * プロジェクト全体で使い回す汎用的な型をまとめています。
 * 具体的な用途を示すことで、初めて触る人にも「いつ使うのか」が伝わるようにしました。
 */
export type Nullable<TValue> = TValue | null;

/**
 * 成功と失敗を安全に表現するための結果型です。
 * 失敗時の情報を丁寧に扱うことで、後続の処理が状況を判断しやすくなります。
 */
export type Result<Success, Failure extends Error> =
  | { readonly ok: true; readonly value: Success }
  | { readonly ok: false; readonly error: Failure };
