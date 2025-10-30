/**
 * tests/unit/metrics ディレクトリの README 代わりとなる説明です。
 * ここで扱うテストは、メトリクス機能を理解し始めた人でも追えるように
 * あえて段階的に構成しています。迷ったらこのコメントを読み返してください。
 */

/**
 * collectText 関数は、対象要素から取得できるテキストや属性をまとめて
 * 1 つの文字列に整理する役割を持っています。データの前処理を行うため、
 * 後続の価格判定やタイトル解析が行いやすくなります。
 * @param element - 文字列を集約したい HTML 要素。null や undefined の場合もあります。
 * @returns 収集した文字列を重複なく並べた結果。空文字の場合もあります。
 * @throws {TypeError} 想定外のオブジェクトを渡した際には例外が起きる方針でテストします。
 */
const metrics = require('../../../content-metrics.js');

const { collectText } = metrics._internals;

describe('collectText', () => {
  describe('正常', () => {
    it('基本的な要素からテキストを収集できる', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('境界', () => {
    it('属性のみが存在する要素でも適切に結合できる', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('異常', () => {
    it('HTMLElement 以外が来たときは例外を想定する', () => {
      // TODO: expect(() => collectText(123)).toThrow();
    });
  });
});
