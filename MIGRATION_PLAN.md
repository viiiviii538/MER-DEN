# MIGRATION PLAN

## 目的
- Chrome 拡張のエントリポイントを段階的に TypeScript 化する準備として、`entrypoints/` 以下に薄いラッパーファイルを追加しました。
- 既存の `background.js` / `content.js` / `popup.js` の挙動を保ちながら、TypeScript からでも同じロジックを参照できる道筋を確保します。

## 今後の作業手順（manifest.json 更新に備えるメモ）
1. `tsc --outDir dist/entrypoints --emitDeclarationOnly false --declaration false entrypoints/*.ts` などで、ラッパーの JavaScript 版をビルドする処理を `build.js` の前段で追加する。
   - 生成される `dist/entrypoints/*.js` は元のファイルをそのまま再公開するだけなので、動作が変わらないことを確認する。
2. `build.js` の `filesToCopy` に `entrypoints/background.js` / `entrypoints/content.js` / `entrypoints/popup.js` を追加し、生成物をパッケージに含める。
3. `manifest.json` の `background.service_worker`、`content_scripts[*].js`、`action.default_popup` などの参照先を、生成されたラッパーに差し替える。
   - これにより、TypeScript 側で型補完を使いつつ、Chrome に配布するビルド物はこれまで通り JavaScript になります。
4. Playwright・Jest・手動動作確認を使って、挙動が変わっていないことを丁寧に確認する。

> 📝 初めて触る人向けメモ: 上の手順は「TypeScript で編集しやすいファイルを追加しつつ、Chrome には従来通りの JavaScript を届ける」ことを目的にしています。順番に実施すれば迷子になりません。
