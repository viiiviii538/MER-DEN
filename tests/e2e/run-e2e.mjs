#!/usr/bin/env node
/**
 * Playwright E2E テストを OS に応じて安全に起動するスクリプトです。
 * Linux でディスプレイが無い場合は xvfb を噛ませ、Windows や macOS では素直に npx playwright を実行します。
 * 高校生向け補足: 画面が無いパソコンでは仮想画面を用意してブラウザを動かすイメージです。
 */
import { spawn, spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readdir } from 'node:fs/promises';
import { delimiter, join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';
import { env, exit, platform } from 'node:process';

console.log('E2E スクリプトを開始しました。Chromium を確認します。');
const extraArgs = process.argv.slice(2);
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';
const hasDisplay = Boolean(env.DISPLAY);

const npxCommand = isWindows ? 'npx.cmd' : 'npx';
await ensureChromiumBrowser();
console.log('Chromium ブラウザの準備が完了しました。テストを開始します。');
const { command, commandArgs, spawnEnv } = await preparePlaywrightCommand();

const child = spawn(command, commandArgs, { stdio: 'inherit', env: spawnEnv });
child.on('error', (error) => {
  console.error('Playwright のプロセス起動に失敗しました。詳細は以下の通りです。');
  console.error(error);
  if (isLinux && !hasDisplay) {
    console.error('Linux で画面が無い場合は xvfb-run をインストールするか、ヘッドレス実行をご利用ください。');
    console.error('高校生向け補足: プロジェクターが無いので映像を映せず止まってしまったイメージです。');
  }
  exit(1);
});
child.on('close', (code, signal) => {
  if (signal) {
    console.error(`Playwright run terminated by signal ${signal}`);
    exit(1);
    return;
  }
  if ((code ?? 0) !== 0) {
    void handleFailure(code ?? 1);
    return;
  }
  exit(0);
});

/**
 * 実行環境に合わせた Playwright の起動コマンドと引数を組み立てます。
 * 高校生向け補足: Windows・Linux などの条件を見て、どのスイッチを押すか自動で決めています。
 */
async function preparePlaywrightCommand() {
  const baseArgs = ['playwright', 'test', ...extraArgs];
  const spawnEnv = { ...env };

  if (isLinux && !hasDisplay) {
    const xvfbAvailable = await commandExists('xvfb-run');
    if (xvfbAvailable) {
      return {
        command: 'xvfb-run',
        commandArgs: ['-a', npxCommand, ...baseArgs],
        spawnEnv
      };
    }

    console.warn('DISPLAY が無い Linux 環境ですが xvfb-run コマンドが見つかりませんでした。ヘッドレスモードで実行します。');
    console.warn('高校生向け補足: 画面が用意できないので、ブラウザの「画面を表示しないモード」に切り替えます。');

    spawnEnv.PLAYWRIGHT_HEADLESS = '1';
    const sanitizedArgs = baseArgs.filter((arg) => arg !== '--headed');
    // --headed が指定されていてもヘッドレスに切り替えるため、引数から外して強制実行します。
    // 高校生向け補足: 「どうしても画面を見せて！」というお願いがあっても、今回は安全のために画面無しにします。
    return {
      command: npxCommand,
      commandArgs: sanitizedArgs,
      spawnEnv
    };
  }

  return {
    command: npxCommand,
    commandArgs: baseArgs,
    spawnEnv
  };
}

/**
 * Chromium ブラウザが欠けているとテストが即座に失敗するため、事前にインストールを強制します。
 * 高校生向け補足: テスト前に「ブラウザという道具」を用意しておかないと授業が始められない、という段取りです。
 */
async function ensureChromiumBrowser() {
  const chromiumExecutable = resolve(homedir(), '.cache', 'ms-playwright', 'chromium-1194', 'chrome-linux', 'chrome');

  try {
    await access(chromiumExecutable, constants.X_OK);
    console.log('Chromium ブラウザは既に配置されています。');
    return;
  } catch {
    console.log('Chromium ブラウザが見つからなかったため、Playwright 経由で取得します。');
  }

  const installProcess = spawnSync(npxCommand, ['playwright', 'install', 'chromium'], { stdio: 'inherit' });

  if (installProcess.error) {
    console.error('Chromium ブラウザのインストールに失敗しました。Playwright の実行環境を確認してください。');
    console.error(installProcess.error);
    console.error('高校生向け補足: 道具が届かなかったので授業が始められない、という状態です。ネットワーク設定などを見直してください。');
    exit(1);
  }

  if ((installProcess.status ?? 0) !== 0) {
    console.error(`Chromium ブラウザのインストールコマンドが終了コード ${(installProcess.status ?? 0)} で停止しました。`);
    console.error('高校生向け補足: インストール途中で止まったので、指示通りにもう一度試すか、通信状況を確認してください。');
    exit(installProcess.status ?? 1);
  }
}

/**
 * Playwright の実行が失敗したときに、調査に使えるアーティファクトの場所を一覧表示します。
 * 高校生向け補足: テストがこけたら「どこに写真が置いてあるか」を黒板に書いて教えてあげる係です。
 */
async function handleFailure(statusCode) {
  const artifactsDir = '.artifacts/e2e';
  try {
    const files = await collectFilesRecursively(artifactsDir);
    console.error('\nPlaywright テストが失敗しました。以下の手順で画像やログを確認できます。');
    console.error('1. tests/e2e/__screenshots__ には比較用の SHA-256 ハッシュ（*.txt）が保存されています。画面の見た目そのものは含まれません。');
    console.error('   高校生向け補足: 写真の代わりに「写真の指紋番号一覧」をノートに控えているイメージです。');
    if (files.length === 0) {
      console.error(`2. 直近の実行では ${artifactsDir} にアーティファクトが見つかりませんでした。`);
      console.error('   失敗直後に再実行した場合は、まず npm run e2e で再度テストを流し直してください。');
    } else {
      console.error(`2. 失敗時の実写・ログ・トレースは ${artifactsDir} 以下に格納されています。主なファイル一覧:`);
      files
        .map((filePath) => relative('.', filePath))
        .forEach((filePath) => {
          console.error(`   - ${filePath}`);
        });
      console.error('   overlay-full-page.png などの添付画像は Playwright レポートに自動で保存され、失敗箇所の実写を確認できます。');
      console.error('   高校生向け補足: 実際の写真やトレースは先生（Playwright）がフォルダーにまとめてくれるので、あとから見返せます。');
    }
    console.error('3. ターミナルで「バイナリファイルがサポートされていない」と表示されても、画像ファイル自体は正しく保存されています。');
    console.error('   画像ビューアーでファイルを開いて確認してください。');
    console.error('4. 見た目の変更が正しい場合は npm run e2e:update でハッシュ値を更新し、Git でコミットしましょう。');
  } catch (error) {
    console.error(`アーティファクトの取得中に問題が発生しました: ${String(error)}`);
    console.error('バイナリファイルの表示エラー自体はテスト失敗時の通常動作なので、画像を直接開いて内容を確認してください。');
  } finally {
    exit(statusCode);
  }
}

/**
 * ディレクトリを再帰的に探索して、見つけたファイルの絶対パスを返します。
 * 高校生向け補足: ファイル棚を順番にのぞいて、置いてあるプリントを全部リスト化する仕組みです。
 */
async function collectFilesRecursively(targetDir) {
  try {
    const entries = await readdir(targetDir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(targetDir, entry.name);
        if (entry.isDirectory()) {
          return collectFilesRecursively(fullPath);
        }
        return [fullPath];
      })
    );
    return files.flat();
  } catch (error) {
    if (/** @type {{ code?: string }} */ (error).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 指定したコマンドが PATH 上に存在するかを確認します。
 * 高校生向け補足: 道具箱の中を探して「xvfb-run」という工具があるかどうか確かめています。
 */
async function commandExists(binaryName) {
  const pathEntries = (env.PATH ?? '').split(delimiter).filter(Boolean);
  if (pathEntries.length === 0) {
    return false;
  }

  for (const directory of pathEntries) {
    const candidate = join(directory, binaryName);
    try {
      await access(candidate, constants.X_OK);
      return true;
    } catch (error) {
      if (/** @type {{ code?: string }} */ (error).code === 'ENOENT') {
        continue;
      }
      try {
        await access(candidate, constants.F_OK);
        return true;
      } catch {
        continue;
      }
    }
  }

  return false;
}
