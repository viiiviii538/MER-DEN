/**
 * これは既存の `popup.js` を TypeScript から取り込むための薄いラッパーです。
 * 実際の表示や処理はすべて元のファイルが担当しており、ここでは挙動を全く変えていません。
 * @remarks manifest.json では以前と同じく `popup.js` を読み込むため、ユーザーが見るポップアップの振る舞いは完全に変わりません。
 */
export * from '../popup.js';

