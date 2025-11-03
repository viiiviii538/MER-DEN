import { defineConfig, devices } from '@playwright/test';

const isCI = process.env.CI === 'true' || process.env.CI === '1';
// PLAYWRIGHT_HEADLESS=1 が設定された場合は強制的にヘッドレス実行へ切り替えます。
// 高校生向け補足: 「画面を表示しないモードで走らせてね」という合図を受け取る旗です。
const forceHeadless = process.env.PLAYWRIGHT_HEADLESS === '1';

export default defineConfig({
  testDir: './tests/e2e',
  /*
   * 期待される DOM とスクリーンショットのスナップショット保存先をひと目で分かるように固定しています。
   * これにより高校生レベルの読者でも「画像は tests/e2e/__screenshots__ に置けば良い」と理解できます。
   */
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    /*
     * maxDiffPixels を指定して、微小なアンチエイリアス差分で不必要な失敗が出ないようにします。
     * 目で見て分かるレベルの違いだけを検出するため、100px のしきい値を採用しています。
     */
    toMatchSnapshot: {
      maxDiffPixels: 100
    }
  },
  /*
   * 初心者にも理解しやすいようにテストの出力先を明示しています。
   * 失敗時のスクリーンショットや差分画像は .artifacts/e2e にまとまります。
   */
  outputDir: '.artifacts/e2e',
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [
        ['junit', { outputFile: '.artifacts/e2e/junit.xml' }],
        ['line']
      ]
    : [['line']],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        headless: forceHeadless ? true : false,
        /*
         * 失敗時には自動でスクリーンショットとトレースを残し、原因調査に outerHTML やログと合わせて利用できます。
         */
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'off'
      }
    }
  ]
});
