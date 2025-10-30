/**
 * tests/unit/metrics ディレクトリの README 代わりとなる説明です。
 * 価格検出のテストケースはこの階層にまとめることで、後続の調査がしやすくなります。
 * これから作るケースの概要をメモしておき、誰でも参加できる雰囲気を大切にします。
 */

/**
 * findPrice 関数は、メルカリの商品要素から金額を読み取り、数値で返す役割を担います。
 * @param element - 価格情報を含む可能性がある HTML 要素。
 * @returns 見つかった金額を数値で返すか、情報が無ければ null を返す予定です。
 * @throws {TypeError} 不正な入力が与えられた場合に例外を投げる方針をテストで確認します。
 */
const metrics = require('../../../content-metrics.js');

const { findPrice } = metrics;

describe('findPrice', () => {
  describe('正常', () => {
    it('代表的な価格表記を数値化できる', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('境界', () => {
    it('税込やカンマ付きなどの境界ケースを扱える', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('異常', () => {
    it('HTMLElement 以外の入力では例外を想定する', () => {
      // TODO: expect(() => findPrice(null)).toThrow();
    });
  });
});
