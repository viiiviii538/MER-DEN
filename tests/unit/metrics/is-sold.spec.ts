/**
 * tests/unit/metrics ディレクトリの README 代わりとなる説明です。
 * 売り切れ判定のテストを分かりやすく整理し、
 * 初めて来た人でも「ここを読めば追える」と分かる入口を作ります。
 */

/**
 * isSold 関数は、商品の表示に含まれるテキストや属性から
 * 売り切れ状態かどうかを判断するための機能です。
 * @param element - 売り切れ表示を含む可能性がある HTML 要素。
 * @returns 売り切れなら true、そうでなければ false を返す予定です。
 * @throws {TypeError} 無効な入力を受け取った場合は例外を投げる方針をテストに反映します。
 */
const metrics = require('../../../content-metrics.js');

// Jest の設定は package.json 内で完結しており、<rootDir> = プロジェクト直下のままです。
// そのため '../../../content-metrics.js' の require がそのまま動作することを確認しておき、
// 後続 PR で実装者が import 設定に悩まず済むようにメモしています。
const { isSold } = metrics;

describe('isSold', () => {
  it('normal', () => {
    // TODO: 「売り切れ」表記が含まれる要素で true になることを確認する
  });

  it('edge', () => {
    // TODO: 英語表記や aria-label で判定する境界ケースを想定する
  });

  it('invalid', () => {
    // TODO: プレーンオブジェクトや数値が渡ったときに例外を投げることを確認する
  });
});

// 高校生向けレビュー: 商品札に「売切」や SOLD と書いてあれば「もう無いよ」と判断し、
// 関係ないものを渡されたら「それは商品札じゃない」と突き返す練習です。
