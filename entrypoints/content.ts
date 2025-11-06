/**
 * これは既存の `content.js` を TypeScript から安全に呼び出すための薄いラッパーです。
 * 処理の本体は元のファイルに残しているため、挙動はこれまでと全く同じです。
 * @remarks manifest.json では `entrypoints/content.js` を読み込むようになりましたが、
 * 実際の機能はこのファイルを経由して元の `content.js` にたどり着きます。
 * 高校生向け補足: 道案内の看板だけ付け替えて、目的地の教室そのものは変えていないイメージです。
 */
export * from '../content.js';

