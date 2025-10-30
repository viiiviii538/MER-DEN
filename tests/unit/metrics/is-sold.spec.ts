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

const { isSold } = metrics;

describe('isSold', () => {
  describe('正常', () => {
    it('売り切れ表記を持つケースを判定できる', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('境界', () => {
    it('英語と日本語が混在する境界ケースを扱える', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('異常', () => {
    it('HTMLElement 以外が入力された場合は例外を想定する', () => {
      // TODO: expect(() => isSold({})).toThrow();
    });
  });
});
