/**
 * ローカルストレージや同期ストレージを抽象化した契約です。
 * 保存と取得の流れを具体的に説明し、初めて拡張機能を触る人でも使い方が理解できるようにしました。
 */
export interface KeyValueStorage {
  /**
   * 指定したキーに値を保存します。
   *
   * @param key - データを識別する文字列。空文字は許容されません。
   * @param value - 保存したい内容。JSON へ変換できる値を想定します。
   * @returns 保存が完了したことを示す Promise。
   * @throws Error - ストレージ容量が不足している、またはアクセス権限がない場合に発生します。
   */
  setItem(key: string, value: unknown): Promise<void>;

  /**
   * 保存済みの値を読み出します。
   *
   * @param key - 取得したいデータの識別子。存在しない場合は undefined を返す実装が想定されます。
   * @returns 値が見つかればそのまま返し、見つからなければ undefined を返す Promise。
   * @throws Error - ストレージが応答しない、またはデータ形式が破損している場合に発生します。
   */
  getItem<TValue>(key: string): Promise<TValue | undefined>;

  /**
   * 指定したキーのデータを削除します。
   *
   * @param key - 消したいデータの識別子。存在しなくてもエラーにはしない実装が望ましいです。
   * @returns 削除完了を示す Promise。
   * @throws Error - ストレージがロックされているなど、削除処理が完了しなかった場合に発生します。
   */
  removeItem(key: string): Promise<void>;
}
