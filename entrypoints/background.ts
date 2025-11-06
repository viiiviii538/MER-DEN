/**
 * これは既存の `background.js` を TypeScript から扱いやすくするための薄いラッパーです。
 * すべての処理は元のファイルに任せており、ここで挙動を変えることは一切ありません。
 * @remarks manifest.json からは `entrypoints/background.js` が読み込まれますが、
 * その中身は最終的にこのファイルを経由して元の `background.js` を参照します。
 * 高校生向け補足: プログラムの入口だけを案内標識で差し替えて、実際の教室（本体の処理）は
 * これまで通りの場所にあるイメージです。
 */
export * from '../background.js';

