/**
 * TANファイルベースの仮想bash環境
 * TANファイルをルートディレクトリとして、制限されたbashコマンドを実行
 */

export interface VirtualFile {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: VirtualFile[];
  permissions: string;
  size: number;
  modified: Date;
}

export interface VirtualFileSystem {
  root: VirtualFile;
  currentDirectory: string;
}

export interface BashCommand {
  command: string;
  args: string[];
  stdin?: string;
}

export interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  newDirectory?: string;
}

export class VirtualBashEnvironment {
  private filesystem: VirtualFileSystem;
  private currentPath: string = '/';
  private environment: Record<string, string> = {};
  private allowedCommands: Set<string>;

  constructor(tanFileContent: string) {
    this.filesystem = this.createFilesystemFromTan(tanFileContent);
    this.allowedCommands = new Set([
      'ls', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'touch', 
      'rm', 'cp', 'mv', 'find', 'grep', 'head', 'tail',
      'wc', 'sort', 'uniq', 'whoami', 'date', 'help'
    ]);
    
    // 基本的な環境変数を設定
    this.environment = {
      'HOME': '/',
      'USER': 'user',
      'PWD': '/',
      'PATH': '/bin:/usr/bin',
      'SHELL': '/bin/bash'
    };
  }

  /**
   * TANファイルの内容から仮想ファイルシステムを作成
   */
  private createFilesystemFromTan(content: string): VirtualFileSystem {
    const now = new Date();
    
    // TANファイルの内容をmain.cppとして配置
    const mainFile: VirtualFile = {
      name: 'main.cpp',
      type: 'file',
      content: content,
      permissions: 'rw-r--r--',
      size: content.length,
      modified: now
    };

    // 基本的なディレクトリ構造を作成
    const binDir: VirtualFile = {
      name: 'bin',
      type: 'directory',
      children: [],
      permissions: 'rwxr-xr-x',
      size: 0,
      modified: now
    };

    const srcDir: VirtualFile = {
      name: 'src',
      type: 'directory',
      children: [mainFile],
      permissions: 'rwxr-xr-x',
      size: 0,
      modified: now
    };

    const tmpDir: VirtualFile = {
      name: 'tmp',
      type: 'directory',
      children: [],
      permissions: 'rwxrwxrwx',
      size: 0,
      modified: now
    };

    const root: VirtualFile = {
      name: '/',
      type: 'directory',
      children: [binDir, srcDir, tmpDir],
      permissions: 'rwxr-xr-x',
      size: 0,
      modified: now
    };

    return {
      root,
      currentDirectory: '/'
    };
  }

  /**
   * bashコマンドを実行
   */
  async executeCommand(commandLine: string): Promise<BashResult> {
    const trimmed = commandLine.trim();
    if (!trimmed) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    // コマンドライン解析
    const parts = this.parseCommandLine(trimmed);
    const { command, args } = parts;

    // sudo の実行を禁止
    if (command === 'sudo') {
      return {
        stdout: '',
        stderr: 'sudo: このコマンドは制限されています',
        exitCode: 1
      };
    }

    // 許可されたコマンドのチェック
    if (!this.allowedCommands.has(command)) {
      return {
        stdout: '',
        stderr: `bash: ${command}: command not found`,
        exitCode: 127
      };
    }

    // コマンド実行
    return await this.executeBuiltinCommand(command, args);
  }

  /**
   * コマンドライン文字列を解析
   */
  private parseCommandLine(commandLine: string): BashCommand {
    // 簡単な実装（実際にはもっと複雑な解析が必要）
    const parts = commandLine.split(/\s+/);
    return {
      command: parts[0],
      args: parts.slice(1)
    };
  }

  /**
   * 組み込みコマンドを実行
   */
  private async executeBuiltinCommand(command: string, args: string[]): Promise<BashResult> {
    switch (command) {
      case 'pwd':
        return this.cmdPwd();
      
      case 'ls':
        return this.cmdLs(args);
      
      case 'cd':
        return this.cmdCd(args);
      
      case 'cat':
        return this.cmdCat(args);
      
      case 'echo':
        return this.cmdEcho(args);
      
      case 'mkdir':
        return this.cmdMkdir(args);
      
      case 'touch':
        return this.cmdTouch(args);
      
      case 'whoami':
        return { stdout: 'user\n', stderr: '', exitCode: 0 };
      
      case 'date':
        return { stdout: new Date().toString() + '\n', stderr: '', exitCode: 0 };
      
      case 'help':
        return this.cmdHelp();
      
      default:
        return {
          stdout: '',
          stderr: `bash: ${command}: command not implemented`,
          exitCode: 1
        };
    }
  }

  private cmdPwd(): BashResult {
    return {
      stdout: this.currentPath + '\n',
      stderr: '',
      exitCode: 0
    };
  }

  private cmdLs(args: string[]): BashResult {
    const currentDir = this.getCurrentDirectory();
    if (!currentDir || !currentDir.children) {
      return {
        stdout: '',
        stderr: 'ls: cannot access current directory',
        exitCode: 1
      };
    }

    const showAll = args.includes('-a');
    const longFormat = args.includes('-l');

    let output = '';
    for (const child of currentDir.children) {
      if (!showAll && child.name.startsWith('.')) continue;
      
      if (longFormat) {
        const typeChar = child.type === 'directory' ? 'd' : '-';
        output += `${typeChar}${child.permissions} 1 user user ${child.size.toString().padStart(8)} ${child.modified.toDateString()} ${child.name}\n`;
      } else {
        output += child.name + '  ';
      }
    }

    if (!longFormat) output += '\n';
    
    return {
      stdout: output,
      stderr: '',
      exitCode: 0
    };
  }

  private cmdCd(args: string[]): BashResult {
    const target = args[0] || '/';
    const newPath = this.resolvePath(target);
    
    const targetDir = this.getDirectoryAtPath(newPath);
    if (!targetDir) {
      return {
        stdout: '',
        stderr: `cd: ${target}: No such file or directory`,
        exitCode: 1
      };
    }

    if (targetDir.type !== 'directory') {
      return {
        stdout: '',
        stderr: `cd: ${target}: Not a directory`,
        exitCode: 1
      };
    }

    this.currentPath = newPath;
    this.environment['PWD'] = newPath;
    
    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      newDirectory: newPath
    };
  }

  private cmdCat(args: string[]): BashResult {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'cat: missing file argument',
        exitCode: 1
      };
    }

    let output = '';
    for (const filename of args) {
      const filePath = this.resolvePath(filename);
      const file = this.getFileAtPath(filePath);
      
      if (!file) {
        return {
          stdout: output,
          stderr: `cat: ${filename}: No such file or directory`,
          exitCode: 1
        };
      }

      if (file.type === 'directory') {
        return {
          stdout: output,
          stderr: `cat: ${filename}: Is a directory`,
          exitCode: 1
        };
      }

      output += file.content || '';
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0
    };
  }

  private cmdEcho(args: string[]): BashResult {
    return {
      stdout: args.join(' ') + '\n',
      stderr: '',
      exitCode: 0
    };
  }

  private cmdMkdir(args: string[]): BashResult {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'mkdir: missing operand',
        exitCode: 1
      };
    }

    // 実装を簡略化（実際にはディレクトリ作成）
    return {
      stdout: '',
      stderr: 'mkdir: operation not supported in read-only filesystem',
      exitCode: 1
    };
  }

  private cmdTouch(args: string[]): BashResult {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'touch: missing file operand',
        exitCode: 1
      };
    }

    // 実装を簡略化（実際にはファイル作成）
    return {
      stdout: '',
      stderr: 'touch: operation not supported in read-only filesystem',
      exitCode: 1
    };
  }

  private cmdHelp(): BashResult {
    const helpText = `Available commands:
  ls [-l] [-a]     - list directory contents
  cd [directory]   - change directory
  pwd             - print working directory
  cat <file>      - display file contents
  echo <text>     - display text
  mkdir <dir>     - create directory (read-only mode)
  touch <file>    - create file (read-only mode)
  whoami          - display current user
  date            - display current date
  help            - show this help

Note: This is a restricted bash environment. sudo and other system commands are disabled.
`;
    return {
      stdout: helpText,
      stderr: '',
      exitCode: 0
    };
  }

  /**
   * パスを解決（相対パス→絶対パス）
   */
  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    
    if (this.currentPath === '/') {
      return '/' + path;
    }
    
    return this.currentPath + '/' + path;
  }

  /**
   * 現在のディレクトリを取得
   */
  private getCurrentDirectory(): VirtualFile | null {
    return this.getDirectoryAtPath(this.currentPath);
  }

  /**
   * 指定パスのディレクトリを取得
   */
  private getDirectoryAtPath(path: string): VirtualFile | null {
    return this.getFileAtPath(path);
  }

  /**
   * 指定パスのファイル/ディレクトリを取得
   */
  private getFileAtPath(path: string): VirtualFile | null {
    const parts = path.split('/').filter(p => p.length > 0);
    
    let current = this.filesystem.root;
    
    for (const part of parts) {
      if (!current.children) return null;
      
      const found = current.children.find(child => child.name === part);
      if (!found) return null;
      
      current = found;
    }
    
    return current;
  }

  /**
   * 現在のディレクトリパスを取得
   */
  getCurrentPath(): string {
    return this.currentPath;
  }
}
