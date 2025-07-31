#!/usr/bin/env node

/**
 * Emscriptenバイナリのダウンロードとセットアップスクリプト
 * 
 * 使用方法:
 * npm run setup-emscripten
 * 
 * または手動で:
 * node scripts/setup-emscripten.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EMSCRIPTEN_VERSION = '3.1.51'; // 安定版を使用
const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'emscripten');

/**
 * emsdkを使ってEmscriptenをセットアップ
 */
async function setupEmscripten() {
  console.log('🚀 Emscripten Setup Script');
  console.log(`Target version: ${EMSCRIPTEN_VERSION}`);
  console.log(`Resources directory: ${RESOURCES_DIR}`);
  
  // resourcesディレクトリを作成
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  }
  
  const originalCwd = process.cwd();
  
  try {
    process.chdir(RESOURCES_DIR);
    
    // emsdkをクローン
    console.log('\n=== Cloning emsdk repository ===');
    try {
      execSync('git clone https://github.com/emscripten-core/emsdk.git', { stdio: 'inherit' });
    } catch (error) {
      if (fs.existsSync('emsdk')) {
        console.log('emsdk already exists, updating...');
        process.chdir('emsdk');
        execSync('git pull', { stdio: 'inherit' });
        process.chdir('..');
      } else {
        throw error;
      }
    }
    
    process.chdir('emsdk');
    
    // Emscriptenをインストール
    console.log('\n=== Installing Emscripten ===');
    const emsdkCmd = process.platform === 'win32' ? 'emsdk.bat' : './emsdk';
    
    execSync(`${emsdkCmd} install ${EMSCRIPTEN_VERSION}`, { stdio: 'inherit' });
    execSync(`${emsdkCmd} activate ${EMSCRIPTEN_VERSION}`, { stdio: 'inherit' });
    
    // 環境を設定
    console.log('\n=== Setting up environment ===');
    const envCmd = process.platform === 'win32' ? 'emsdk_env.bat' : './emsdk_env.sh';
    execSync(envCmd, { stdio: 'inherit' });
    
    // プラットフォーム別のディレクトリを作成してバイナリをコピー
    console.log('\n=== Copying binaries ===');
    const platformMap = {
      win32: 'win32',
      linux: 'linux', 
      darwin: 'darwin'
    };
    
    const currentPlatform = platformMap[process.platform] || 'linux';
    const platformDir = path.join('..', currentPlatform);
    
    if (!fs.existsSync(platformDir)) {
      fs.mkdirSync(platformDir, { recursive: true });
    }
    
    // upstreamディレクトリからバイナリを探す
    const upstreamDir = path.join('upstream');
    if (fs.existsSync(upstreamDir)) {
      // 再帰的にemccなどのバイナリを探してコピー
      findAndCopyBinaries(upstreamDir, platformDir);
    }
    
    // emscriptenディレクトリからもコピー
    const emscriptenDir = path.join('upstream', 'emscripten');
    if (fs.existsSync(emscriptenDir)) {
      findAndCopyBinaries(emscriptenDir, platformDir);
    }
    
    console.log(`\n✅ Emscripten setup completed for ${currentPlatform}!`);
    console.log('\nNext steps:');
    console.log('1. Build your application with: npm run build');
    console.log('2. Emscripten binaries will be bundled automatically');
    
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  } finally {
    process.chdir(originalCwd);
  }
}

/**
 * バイナリファイルを再帰的に探してコピー
 */
function findAndCopyBinaries(sourceDir, targetDir) {
  const binaryNames = ['emcc', 'em++', 'emar', 'emranlib'];
  const extensions = process.platform === 'win32' ? ['.exe', '.bat'] : [''];
  
  function searchDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        searchDirectory(fullPath);
      } else if (item.isFile()) {
        // バイナリファイルかチェック
        for (const binaryName of binaryNames) {
          for (const ext of extensions) {
            if (item.name === binaryName + ext) {
              const targetPath = path.join(targetDir, item.name);
              console.log(`Copying ${fullPath} -> ${targetPath}`);
              try {
                fs.copyFileSync(fullPath, targetPath);
                // 実行権限を付与（Unix系）
                if (process.platform !== 'win32') {
                  fs.chmodSync(targetPath, 0o755);
                }
              } catch (error) {
                console.warn(`Failed to copy ${fullPath}:`, error.message);
              }
            }
          }
        }
      }
    }
  }
  
  searchDirectory(sourceDir);
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  setupEmscripten();
}

module.exports = { setupEmscripten };
