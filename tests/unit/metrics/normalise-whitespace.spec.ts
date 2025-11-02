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

// Jest の解決ルールは package.json の通りで、追加の moduleNameMapper などは不要です。
// そのため '../../../content-metrics.js' の require でユニットテストを組み立てられることを確認し、
// 後続 PR でこの雛形を発展させやすいようコメントを残しています。
const { normaliseWhitespace } = metrics._internals;

describe('normaliseWhitespace', () => {
  it('normal', () => {
    // TODO: 改行や複数スペースを含む文章が 1 行に整うことを確認する
  });

  it('edge', () => {
    // TODO: 空文字・タブのみなどの境界入力でも期待通りに処理されることを確認する
  });

  it('invalid', () => {
    // TODO: 文字列以外の入力では例外が投げられることを確認する
  });
});

// 高校生向けレビュー: レポート原稿の余分なスペースや改行を先生に提出する前に整える練習です。
