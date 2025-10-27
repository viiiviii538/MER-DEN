// @ts-check
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const distZipPath = path.join(rootDir, 'dist.zip');

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
  'assets'
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
