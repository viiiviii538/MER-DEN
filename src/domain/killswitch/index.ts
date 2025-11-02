/**
 * 機能の停止スイッチに関する状態や操作を型で表現します。
 * サービス全体の安全装置を説明することで、初めて読む人にも意味が伝わるようにしています。
 */
export type KillSwitchStatus = 'active' | 'inactive';

/**
 * 機能停止スイッチの状態を確認・変更するための契約です。
 * API やリモート設定サービスを利用する実装が想定されますが、ここでは仕組みを説明するだけです。
 */
export interface KillSwitchGateway {
  /**
   * 現在の停止スイッチ状態を取得します。
   *
   * @returns スイッチが有効であれば 'active'、無効であれば 'inactive' を Promise で返します。
   * @throws Error - ネットワーク障害、応答のタイムアウト、設定ファイルの破損などで状態が読み出せない場合に発生します。
   */
  fetchStatus(): Promise<KillSwitchStatus>;

  /**
   * 停止スイッチの状態を更新し、利用者への影響を調整します。
   *
   * @param status - 新しく適用したい状態。'active' を指定すれば機能が停止し、'inactive' で再開します。
   * @returns 操作が成功したことを示す Promise が返ります。
   * @throws Error - 書き込み権限が不足している、競合が発生した、または設定サービスの応答がタイムアウトした場合に失敗します。
   */
  updateStatus(status: KillSwitchStatus): Promise<void>;
}
