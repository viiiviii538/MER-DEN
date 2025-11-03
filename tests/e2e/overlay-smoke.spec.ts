import { createHash } from 'crypto';
import { expect, test } from '@playwright/test';

const likesFixture = [
  { id: 'm0001', like: 45 },
  { id: 'm0002', like: 3 },
  { id: 'm0003', like: 0 }
];

const fixtureHtml = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>MerSearch Smoke Fixture</title>
    <style>
      body { font-family: 'Noto Sans JP', sans-serif; margin: 0; padding: 32px; background: #f9fafb; }
      h1 { margin-bottom: 24px; }
      ul { display: grid; grid-template-columns: repeat(3, minmax(200px, 1fr)); gap: 16px; padding: 0; list-style: none; }
      .card { position: relative; background: #fff; border-radius: 12px; border: 1px solid #dfe3e8; padding: 16px; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); text-decoration: none; color: inherit; }
      .card .title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
      .card .merPrice { font-size: 16px; color: #0f172a; }
      .card .mer-badge { position: absolute; top: 12px; right: 12px; background: #ef4444; color: #fff; font-weight: 700; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3); }
      .card.sold::after { content: 'SOLD'; position: absolute; top: 0; left: 0; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #fff; background: #0f172a; border-bottom-right-radius: 8px; }
      #mer-helper-overlay { position: fixed; top: 24px; right: 24px; width: 280px; border-radius: 16px; background: linear-gradient(145deg, #2563eb, #1d4ed8); color: #fff; padding: 20px; box-shadow: 0 12px 32px rgba(37, 99, 235, 0.28); }
      #mer-helper-overlay .mh-title { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
      #mer-helper-overlay .mh-body { font-size: 14px; line-height: 1.6; white-space: pre-line; }
    </style>
  </head>
  <body>
    <h1 data-testid="fixture-title">MerSearch Helper smoke fixture</h1>
    <div id="mer-helper-overlay">
      <div class="mh-title">読み込み中...</div>
      <div class="mh-body">スタブ通信を待機しています。</div>
    </div>
    <ul>
      <li>
        <a class="card" data-item-id="m0001" href="/item/m0001">
          <span class="title">Alpha Jacket</span>
          <span class="merPrice">¥1,200</span>
          <div class="mer-badge">♥ -</div>
        </a>
      </li>
      <li>
        <a class="card" data-item-id="m0002" href="/item/m0002">
          <span class="title">Beta Shoes</span>
          <span class="merPrice">¥3,400</span>
          <div class="mer-badge">♥ -</div>
        </a>
      </li>
      <li>
        <a class="card sold" data-item-id="m0003" href="/item/m0003">
          <span class="title">Gamma Coat</span>
          <span class="merPrice">¥800</span>
          <div class="mer-badge">♥ -</div>
        </a>
      </li>
    </ul>
  </body>
</html>`;

test('overlay metrics, heart badges, and screenshot stay stable', async ({ page }) => {
  await page.route('https://script.google.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, active: true })
    });
  });
  await page.route('https://jp.mercari.com/api/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        metrics: {
          active: 2,
          sold: 1,
          range: '¥800〜¥3,400',
          total: likesFixture.length
        },
        likes: likesFixture
      })
    });
  });

  await page.setContent(fixtureHtml, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const killSwitch = await fetch('https://script.google.com/mock').then((res) => res.json());
    if (!killSwitch.active) {
      throw new Error('kill switch disabled by stub');
    }
    const search = await fetch('https://jp.mercari.com/api/search?keyword=smoke').then((res) => res.json());
    const overlay = document.getElementById('mer-helper-overlay');
    if (!overlay) throw new Error('overlay not found');
    overlay.querySelector('.mh-title').textContent = 'MerSearch Helper';
    overlay.querySelector('.mh-body').textContent = [
      '出品中：' + search.metrics.active,
      '売り切れ：' + search.metrics.sold,
      'レンジ(全件)：' + search.metrics.range,
      '取得：' + search.metrics.total + '件'
    ].join('\n');
    search.likes.forEach(({ id, like }) => {
      const badge = document.querySelector('[data-item-id="' + id + '"] .mer-badge');
      if (badge) badge.textContent = '♥ ' + like;
    });
  });

  const overlay = page.locator('#mer-helper-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.mh-title')).toHaveText('MerSearch Helper');
  const overlayBody = overlay.locator('.mh-body');
  await expect(overlayBody).toContainText('出品中：2');
  await expect(overlayBody).toContainText('売り切れ：1');
  await expect(overlayBody).toContainText('レンジ(全件)：¥800〜¥3,400');
  await expect(overlayBody).toContainText('取得：3件');

  await expect(page.locator('[data-item-id="m0001"] .mer-badge')).toHaveText('♥ 45');
  await expect(page.locator('[data-item-id="m0002"] .mer-badge')).toHaveText('♥ 3');
  await expect(page.locator('[data-item-id="m0003"] .mer-badge')).toHaveText('♥ 0');

  // 画面全体のスクリーンショットを撮影し、後続のハッシュ比較とレポート添付に利用します。
  // 高校生向け補足: 発表会で展示する作品をいったん写真に撮り、記録用と先生への提出用に使い回すイメージです。
  const screenshotBuffer = await page.screenshot({ animations: 'disabled', fullPage: true });
  await test.info().attach('overlay-full-page', {
    body: screenshotBuffer,
    contentType: 'image/png',
    description:
      'オーバーレイ全体のキャプチャです。テストが失敗したときに Playwright レポートから直接確認できます。高校生向け補足: 記録用に撮った写真を先生に預けるイメージです。'
  });

  // 画像そのものをリポジトリに含めずに検証するため、ハッシュ値（要するに写真の指紋）で差分を確認します。
  // 高校生向け補足: 写真をそのまま貼らず、「この写真は指紋番号123です」とメモしておき、あとから番号を比べるイメージです。
  const screenshotHash = createHash('sha256').update(screenshotBuffer).digest('hex');
  const snapshotContent = `${screenshotHash}\n`;
  await expect(snapshotContent).toMatchSnapshot('overlay-smoke.sha256.txt');
});
