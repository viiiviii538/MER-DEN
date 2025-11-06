// @ts-check
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const distZipPath = path.join(rootDir, 'dist.zip');
const entrypointsDir = path.join(rootDir, 'entrypoints');
const entrypointsBuildConfig = path.join(rootDir, 'tsconfig.entrypoints.json');

/**
 * TypeScript で書かれたエントリーポイントを JavaScript に変換します。
 *
 * 高校生向け補足: 「文化祭で配るプリントを Word で作ったあと、PDF に書き出す」
 * というイメージで、配布用の完成品（dist/entrypoints/*.js）をここで作成しています。
 */
function compileEntrypoints() {
  if (!fs.existsSync(entrypointsDir)) {
    console.warn('Skipping TypeScript compilation: entrypoints directory does not exist.');
    return;
  }

  const tscArgs = [
    'tsc',
    '--project',
    entrypointsBuildConfig,
    '--noEmit',
    'false',
    '--declaration',
    'false'
  ];

  const result = spawnSync('npx', tscArgs, { cwd: rootDir, stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error('TypeScript compilation for entrypoints failed');
  }
}

const filesToCopy = [
  'manifest.json',
  'background.js',
  'content.js',
  'content-metrics.js',
  'overlay.css',
  'popup.html',
  'popup.js'
];

const directoriesToCopy = [
  'assets',
  'entrypoints'
];

function removeDirIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function removeFileIfExists(targetPath) {
  if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isFile()) {
    fs.rmSync(targetPath, { force: true });
  }
}

function copyFile(source, destination) {
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

function copyDirectory(source, destination) {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(destinationPath));
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function build() {
  removeDirIfExists(distDir);
  ensureDir(distDir);

  compileEntrypoints();

  filesToCopy.forEach((file) => {
    const sourcePath = path.join(rootDir, file);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Skipping missing file: ${file}`);
      return;
    }
    const destinationPath = path.join(distDir, file);
    copyFile(sourcePath, destinationPath);
  });

  directoriesToCopy.forEach((dir) => {
    if (dir === 'entrypoints') {
      // ここでは既に TypeScript から生成したファイルが dist/entrypoints に存在するため
      // コピーではなく生成済みフォルダーの存在チェックだけを行います。
      // 高校生向け補足: 「印刷したプリントがもう机に並んでいるか確認するだけ」です。
      const compiledDir = path.join(distDir, dir);
      if (!fs.existsSync(compiledDir)) {
        console.warn(`Skipping missing directory: ${dir}`);
      }
      return;
    }

    const sourcePath = path.join(rootDir, dir);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Skipping missing directory: ${dir}`);
      return;
    }
    const destinationPath = path.join(distDir, dir);
    ensureDir(destinationPath);
    copyDirectory(sourcePath, destinationPath);
  });

  removeFileIfExists(distZipPath);
  const zipResult = spawnSync(
    'zip',
    ['-r', distZipPath, path.basename(distDir)],
    { cwd: rootDir, stdio: 'inherit' }
  );

  if (zipResult.status !== 0) {
    throw new Error('Failed to create dist.zip');
  }
}

build();
