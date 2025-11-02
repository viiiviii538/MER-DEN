/**
 * これは既存の `content.js` を TypeScript から安全に呼び出すための薄いラッパーです。
 * 処理の本体は元のファイルに残しているため、挙動はこれまでと全く同じです。
 * @remarks manifest.json では引き続き `content.js` を参照しているので、利用側の設定や振る舞いは一切変わりません。
 */
export * from '../content.js';

