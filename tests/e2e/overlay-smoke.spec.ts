import path from 'path';
import { expect, test } from '@playwright/test';
import { stubRandom } from '../helpers/stubRandom';

test.describe('MerSearch Helper overlay smoke test', () => {
  test('displays overlay metrics and like badges without binary artifacts', async ({ playwright }, testInfo) => {
    const extensionPath = path.resolve(__dirname, '..', '..');
    const likesById: Record<string, number> = {
      m0001: 45,
      m0002: 3,
      m0003: 0
    };

    const searchPageHtml = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>MerSearch Fixture</title>
    <style>
      body { font-family: sans-serif; margin: 0; padding: 24px; }
      ul { list-style: none; padding: 0; }
      li { margin-bottom: 16px; }
      .card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; display: block; color: inherit; text-decoration: none; }
      .card .title { display: block; font-weight: bold; margin-bottom: 8px; }
      .card .merPrice { display: block; font-size: 18px; margin-bottom: 4px; }
      .card .meta { font-size: 12px; color: #666; }
      .card.sold .title { color: #b00; }
      .card .sold-flag { font-weight: bold; color: #c00; }
    </style>
  </head>
  <body>
    <h1 data-testid="page-title">MerSearch Fixture</h1>
    <ul id="items">
      <li>
        <a class="card" data-item-id="m0001" href="/item/m0001">
          <span class="title">Alpha Jacket</span>
          <span class="merPrice">¥1,200</span>
          <div class="meta">カラー: ネイビー / 在庫あり</div>
        </a>
      </li>
      <li>
        <a class="card" data-item-id="m0002" href="/item/m0002">
          <span class="title">Beta Shoes</span>
          <span class="merPrice">¥3,400</span>
          <div class="meta">サイズ: 26cm / 在庫わずか</div>
        </a>
      </li>
      <li>
        <a class="card sold" data-item-id="m0003" href="/item/m0003">
          <span class="title">Gamma Coat</span>
          <span class="merPrice">¥800</span>
          <span class="sold-flag" aria-label="SOLD">SOLD</span>
        </a>
      </li>
    </ul>
  </body>
</html>`;

    const detailPageFor = (id: string, likes: number) => `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>${id} detail</title>
  </head>
  <body>
    <main>
      <h1 data-testid="item-name">${id} detail</h1>
      <div data-testid="icon-heart-button">
        <span class="merText">${likes}</span>
      </div>
      <button aria-label="いいね ${likes}">♥ ${likes}</button>
    </main>
  </body>
</html>`;

    const consoleLogs: Array<{ type: string; text: string }> = [];
    let attachDebug = false;
    let overlayDebug: unknown = null;
    let badgeDebug: unknown = null;

    const context = await playwright.chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    const collectDebug = async () => {
      const pages = context.pages();
      const page = pages[0];
      if (!page || page.isClosed()) return;
      overlayDebug = await page.evaluate(() => {
        const overlay = document.querySelector('#mer-helper-overlay');
        if (!overlay) return null;
        const computed = window.getComputedStyle(overlay);
        return {
          outerHTML: overlay.outerHTML,
          textContent: overlay.textContent,
          computed: {
            display: computed.display,
            position: computed.position,
            top: computed.top,
            left: computed.left,
            width: computed.width
          }
        };
      });
      badgeDebug = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[data-item-id]')).map((node) => {
          const anchor = node as HTMLAnchorElement;
          const badge = anchor.querySelector('.mer-badge');
          return {
            id: anchor.getAttribute('data-item-id'),
            badge: badge?.textContent,
            badgeHTML: badge?.outerHTML
          };
        });
      });
    };

    const stubRandomSource = `(${stubRandom.toString()})`;

    try {
      await context.route('https://script.google.com/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ ok: true, active: true })
        });
      });
      await context.route('https://script.googleusercontent.com/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ ok: true, active: true })
        });
      });
      const fulfillDetail = async (route: import('@playwright/test').Route) => {
        const url = new URL(route.request().url());
        const idMatch = url.pathname.match(/m[0-9A-Za-z]+/);
        const id = idMatch ? idMatch[0] : 'unknown';
        const likes = likesById[id as keyof typeof likesById] ?? 0;
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: detailPageFor(id, likes)
        });
      };
      await context.route('https://jp.mercari.com/item/**', fulfillDetail);
      await context.route('https://www.mercari.com/jp/items/**', fulfillDetail);
      await context.route('https://jp.mercari.com/search**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: searchPageHtml
        });
      });

      const page = context.pages()[0] ?? (await context.waitForEvent('page'));
      await page.addInitScript(({ randomValues, stubSource }) => {
        const fixedNow = 1_700_000_000_000;
        const OriginalDate = Date;
        function MockDate(this: Date, ...args: ConstructorParameters<typeof Date>) {
          if (!(this instanceof MockDate)) {
            // @ts-ignore -- calling as function should behave like Date()
            return OriginalDate(...args);
          }
          if (args.length === 0) {
            // @ts-ignore -- returning Date instance
            return new OriginalDate(fixedNow);
          }
          // @ts-ignore -- returning Date instance with args
          return new OriginalDate(...args);
        }
        MockDate.prototype = OriginalDate.prototype;
        Object.setPrototypeOf(MockDate, OriginalDate);
        // @ts-ignore - override global Date
        window.Date = MockDate as unknown as DateConstructor;
        Object.defineProperty(Date, 'now', {
          configurable: true,
          writable: true,
          value: () => fixedNow
        });
        const stub = (0, eval)(stubSource) as typeof stubRandom;
        stub(randomValues);
        let perfCalls = 0;
        Object.defineProperty(performance, 'now', {
          configurable: true,
          writable: true,
          value: () => 500 + perfCalls++ * 7
        });
      }, { randomValues: [0.19, 0.23, 0.41, 0.59], stubSource: stubRandomSource });
      page.on('console', (msg) => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
      });

      await page.goto('https://jp.mercari.com/search?keyword=overlay-smoke');
      await page.waitForLoadState('networkidle');
      if (!context.serviceWorkers().length) {
        await context.waitForEvent('serviceworker', { timeout: 10_000 }).catch(() => undefined);
      }

      const overlay = page.locator('#mer-helper-overlay');
      await expect(overlay).toBeVisible({ timeout: 5_000 });
      await expect(overlay.locator('.mh-title')).toHaveText('MerSearch Helper');
      await expect(overlay.locator('.mh-body')).toContainText([
        '出品中：2',
        '売り切れ：1',
        'レンジ(全件)：¥800〜¥3,400',
        '取得：3件'
      ]);

      const badgeFor = (id: string) => page.locator(`a[data-item-id="${id}"] .mer-badge`);
      await expect(badgeFor('m0001')).toHaveText('♥ 45', { timeout: 15_000 });
      await expect(badgeFor('m0002')).toHaveText('♥ 3', { timeout: 15_000 });
      await expect(badgeFor('m0003')).toHaveText('♥ 0', { timeout: 15_000 });
    } catch (error) {
      attachDebug = true;
      await collectDebug();
      throw error;
    } finally {
      if (attachDebug) {
        if (consoleLogs.length) {
          await testInfo.attach('page-console.json', {
            body: JSON.stringify(consoleLogs, null, 2),
            contentType: 'application/json'
          });
        }
        if (overlayDebug) {
          await testInfo.attach('overlay-state.json', {
            body: JSON.stringify(overlayDebug, null, 2),
            contentType: 'application/json'
          });
        }
        if (badgeDebug) {
          await testInfo.attach('badge-state.json', {
            body: JSON.stringify(badgeDebug, null, 2),
            contentType: 'application/json'
          });
        }
      }
      await context.close();
    }
  });
});
