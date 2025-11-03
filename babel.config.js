// Jest で TypeScript の構文を扱うために Babel の変換設定を定義する。
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current'
        }
      }
    ],
    '@babel/preset-typescript'
  ]
};
