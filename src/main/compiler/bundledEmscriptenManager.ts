/**
 * バンドル版Emscripten管理システム
 * アプリケーションにバンドルされたEmscriptenバイナリを管理
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';

export interface BundledEmscripten {
  version: string;
  platform: string;
  arch: string;
  emccPath: string;
  emscoriptenRoot: string;
  llvmRoot: string;
  available: boolean;
}

export class BundledEmscriptenManager {
  private static instance: BundledEmscriptenManager | null = null;
  private bundledEmscripten: BundledEmscripten | null = null;
  private resourcesPath: string;

  private constructor() {
    // アプリケーションのresourcesパスを取得
    if (app.isPackaged) {
      // パッケージ版では複数のパスを試行
      const possiblePaths = [
        path.join(process.resourcesPath, 'emscripten'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'emscripten'),
        path.join(path.dirname(process.execPath), 'resources', 'emscripten'),
        path.join(app.getAppPath(), 'resources', 'emscripten')
      ];
      
      // 実際に存在するパスを探す
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          this.resourcesPath = testPath;
          console.log('[Emscripten] Found resources at:', testPath);
          return;
        }
      }
      
      // どれも見つからない場合はデフォルト
      this.resourcesPath = possiblePaths[0];
      console.warn('[Emscripten] No resources found, using default:', this.resourcesPath);
    } else {
      // 開発版
      this.resourcesPath = path.join(app.getAppPath(), 'resources', 'emscripten');
    }
  }

  static getInstance(): BundledEmscriptenManager {
    if (!BundledEmscriptenManager.instance) {
      BundledEmscriptenManager.instance = new BundledEmscriptenManager();
    }
    return BundledEmscriptenManager.instance;
  }

  /**
   * バンドル版Emscriptenの初期化と検出
   */
  async initialize(): Promise<BundledEmscripten | null> {
    try {
      console.log('[Emscripten] Bundled Emscripten initializing...');
      console.log('Resources path:', this.resourcesPath);

      const platform = this.getPlatformName();
      const arch = this.getArchName();
      
      const platformPath = path.join(this.resourcesPath, platform);
      console.log('Platform path:', platformPath);

      // プラットフォーム固有ディレクトリが存在するかチェック
      if (!await fs.pathExists(platformPath)) {
        console.log(`プラットフォーム固有ディレクトリが見つかりません: ${platformPath}`);
        return null;
      }

      // Emscriptenのバイナリパスを構築（プラットフォーム固有の場所）
      const emccFileName = platform === 'win32' ? 'emcc.bat' : 'emcc.sh';
      const emccPath = path.join(platformPath, emccFileName);

      // emccバイナリが存在するかチェック
      if (!await fs.pathExists(emccPath)) {
        console.log(`emccバイナリが見つかりません: ${emccPath}`);
        return null;
      }

      // バンドル版Emscriptenの情報を作成
      this.bundledEmscripten = {
        version: await this.detectVersion(emccPath),
        platform,
        arch,
        emccPath,
        emscoriptenRoot: platformPath,
        llvmRoot: platformPath,
        available: true
      };

      console.log('[Emscripten] Bundled info:', this.bundledEmscripten);

      // 実行権限を設定（Unix系のみ）
      if (platform !== 'win32') {
        await this.setExecutablePermissions(platformPath);
      }

      return this.bundledEmscripten;

    } catch (error) {
      console.error('[Emscripten] Bundled initialization failed:', error);
      return null;
    }
  }

  /**
   * バンドル版Emscriptenの情報を取得
   */
  getBundledEmscripten(): BundledEmscripten | null {
    return this.bundledEmscripten;
  }

  /**
   * バンドル版Emscriptenが利用可能かチェック
   */
  isAvailable(): boolean {
    return this.bundledEmscripten?.available ?? false;
  }

  /**
   * Emccコマンドの絶対パスを取得
   */
  getEmccPath(): string {
    if (!this.isAvailable()) {
      throw new Error('Bundled Emscripten is not available');
    }
    
    const emsdkPath = path.join(this.resourcesPath, 'emsdk');
    const emscriptenPath = path.join(emsdkPath, 'upstream', 'emscripten');
    
    const platform = this.getPlatformName();
    if (platform === 'win32') {
      return path.join(emscriptenPath, 'emcc.bat');
    } else {
      return path.join(emscriptenPath, 'emcc');
    }
  }

  /**
   * Em++コマンドの絶対パスを取得
   */
  getEmPlusPlusPath(): string {
    if (!this.isAvailable()) {
      throw new Error('Bundled Emscripten is not available');
    }
    
    const emsdkPath = path.join(this.resourcesPath, 'emsdk');
    const emscriptenPath = path.join(emsdkPath, 'upstream', 'emscripten');
    
    const platform = this.getPlatformName();
    if (platform === 'win32') {
      return path.join(emscriptenPath, 'em++.bat');
    } else {
      return path.join(emscriptenPath, 'em++');
    }
  }

  /**
   * Emarコマンドの絶対パスを取得
   */
  getEmarPath(): string {
    if (!this.isAvailable()) {
      throw new Error('Bundled Emscripten is not available');
    }
    
    const emsdkPath = path.join(this.resourcesPath, 'emsdk');
    const emscriptenPath = path.join(emsdkPath, 'upstream', 'emscripten');
    
    const platform = this.getPlatformName();
    if (platform === 'win32') {
      return path.join(emscriptenPath, 'emar.bat');
    } else {
      return path.join(emscriptenPath, 'emar');
    }
  }

  /**
   * バンドル版Emscripten用の環境変数を取得
   */
  getEnvironmentVariables(): NodeJS.ProcessEnv {
    if (!this.isAvailable()) {
      return {};
    }

    const emsdkPath = path.join(this.resourcesPath, 'emsdk');
    const emscriptenPath = path.join(emsdkPath, 'upstream', 'emscripten');
    const nodePath = path.join(emsdkPath, 'node', '22.16.0_64bit', 'bin');
    const pythonPath = path.join(emsdkPath, 'python', '3.13.3_64bit');
    
    const platform = this.getPlatformName();
    const separator = platform === 'win32' ? ';' : ':';
    
    const newPath = [
      emscriptenPath,
      nodePath,
      process.env.PATH || ''
    ].join(separator);
    
    return {
      EMSDK: emsdkPath,
      PATH: newPath,
      EMSDK_NODE: path.join(nodePath, platform === 'win32' ? 'node.exe' : 'node'),
      EMSDK_PYTHON: path.join(pythonPath, platform === 'win32' ? 'python.exe' : 'python')
    };
  }

  /**
   * プラットフォーム名を取得
   */
  private getPlatformName(): string {
    const platform = os.platform();
    switch (platform) {
      case 'win32':
        return 'win32';
      case 'darwin':
        return 'darwin';
      case 'linux':
        return 'linux';
      default:
        throw new Error(`サポートされていないプラットフォーム: ${platform}`);
    }
  }

  /**
   * アーキテクチャ名を取得
   */
  private getArchName(): string {
    const arch = os.arch();
    switch (arch) {
      case 'x64':
        return 'x64';
      case 'arm64':
        return 'arm64';
      case 'ia32':
        return 'x32';
      default:
        return arch;
    }
  }

  /**
   * Emscriptenのバージョンを検出
   */
  private async detectVersion(emccPath: string): Promise<string> {
    try {
      // バージョン情報ファイルがあるかチェック
      const versionFile = path.join(path.dirname(emccPath), '..', 'emscripten-version.txt');
      if (await fs.pathExists(versionFile)) {
        const version = await fs.readFile(versionFile, 'utf8');
        return version.trim();
      }
      
      // デフォルトバージョン
      return 'bundled';
    } catch (error) {
      console.warn('バージョン検出に失敗:', error);
      return 'unknown';
    }
  }

  /**
   * 実行権限を設定（Unix系）
   */
  private async setExecutablePermissions(emscriptenRoot: string): Promise<void> {
    try {
      const binPath = path.join(emscriptenRoot, 'bin');
      if (await fs.pathExists(binPath)) {
        // binディレクトリ内のすべてのファイルに実行権限を付与
        const files = await fs.readdir(binPath);
        for (const file of files) {
          const filePath = path.join(binPath, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            await fs.chmod(filePath, 0o755);
          }
        }
      }

      const llvmBinPath = path.join(emscriptenRoot, 'llvm', 'bin');
      if (await fs.pathExists(llvmBinPath)) {
        // LLVMバイナリにも実行権限を付与
        const files = await fs.readdir(llvmBinPath);
        for (const file of files) {
          const filePath = path.join(llvmBinPath, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            await fs.chmod(filePath, 0o755);
          }
        }
      }
    } catch (error) {
      console.warn('実行権限の設定に失敗:', error);
    }
  }

  /**
   * バンドル版Emscriptenのダウンロードスクリプトを生成
   */
  generateDownloadScript(): string {
    const platform = this.getPlatformName();
    const arch = this.getArchName();

    return `#!/bin/bash
# Emscripten自動ダウンロードスクリプト
# プラットフォーム: ${platform}, アーキテクチャ: ${arch}

set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
EMSCRIPTEN_DIR="\$SCRIPT_DIR/resources/emscripten/${platform}"

echo "Emscriptenをダウンロード中..."

# 一時ディレクトリを作成
TEMP_DIR="\$(mktemp -d)"
cd "\$TEMP_DIR"

# Emscripten SDKをクローン
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# 最新版をインストール
./emsdk install latest
./emsdk activate latest

# バンドル用ディレクトリを作成
mkdir -p "\$EMSCRIPTEN_DIR"

# 必要なファイルをコピー
cp -r upstream/emscripten/* "\$EMSCRIPTEN_DIR/"
cp -r upstream/bin "\$EMSCRIPTEN_DIR/"

# LLVMをコピー
if [ -d "upstream/llvm" ]; then
    cp -r upstream/llvm "\$EMSCRIPTEN_DIR/"
fi

# バージョン情報を保存
echo "\$(./emcc --version | head -n 1)" > "\$EMSCRIPTEN_DIR/emscripten-version.txt"

# 一時ディレクトリを削除
cd /
rm -rf "\$TEMP_DIR"

echo "Emscriptenのダウンロードが完了しました: \$EMSCRIPTEN_DIR"
`;
  }
}

// シングルトンインスタンス
export function getBundledEmscriptenManager(): BundledEmscriptenManager {
  return BundledEmscriptenManager.getInstance();
}
