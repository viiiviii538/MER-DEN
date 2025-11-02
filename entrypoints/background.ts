/**
 * これは既存の `background.js` を TypeScript から扱いやすくするための薄いラッパーです。
 * すべての処理は元のファイルに任せており、ここで挙動を変えることは一切ありません。
 * @remarks manifest.json では従来どおり `background.js` を読み込むため、参照先と機能は完全に不変です。
 */
export * from '../background.js';

