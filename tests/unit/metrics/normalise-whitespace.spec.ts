/**
 * tests/unit/metrics ディレクトリの README 代わりとなる説明です。
 * ここではメルカリ用メトリクス関連のユニットテスト方針をメモし、
 * 後から参加する仲間が迷わず追加・更新できるようにします。
 */

/**
 * normaliseWhitespace 関数は、HTML から取得したテキスト内の余分な空白や
 * 改行を統一し、比較しやすい形に整えることを目的としています。
 * @param input - メルカリ画面から取得した文字列。空白や改行を含む場合があります。
 * @returns 整形された文字列。空白は 1 文字に統一され、前後の空白は取り除かれます。
 * @throws {TypeError} 入力が文字列でない場合は例外が発生する想定でテストします。
 */
const metrics = require('../../../content-metrics.js');

const { normaliseWhitespace } = metrics._internals;

describe('normaliseWhitespace', () => {
  describe('正常', () => {
    it('通常の文章内の余分な空白を整形できる', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('境界', () => {
    it('空文字や半角スペースのみのケースを扱える', () => {
      // TODO: 仕様確定後に実装
    });
  });

  describe('異常', () => {
    it('文字列以外の入力に対して例外が投げられる', () => {
      // TODO: expect(() => normaliseWhitespace(null)).toThrow();
    });
  });
});
