import * as fs from 'fs';
import { EventEmitter } from 'events';

export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  timestamp: Date;
}

export class FileSystemWatcher extends EventEmitter {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  // ディレクトリの監視開始
  watchDirectory(dirPath: string): void {
    if (this.watchers.has(dirPath)) {
      return; // 既に監視中
    }

    const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (filename) {
        const fullPath = `${dirPath}/${filename}`;
        const event: FileChangeEvent = {
          type: this.mapEventType(eventType),
          path: fullPath,
          timestamp: new Date()
        };
        this.emit('fileChange', event);
      }
    });

    this.watchers.set(dirPath, watcher);
  }

  // 監視停止
  unwatchDirectory(dirPath: string): void {
    const watcher = this.watchers.get(dirPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(dirPath);
    }
  }

  // 全ての監視を停止
  unwatchAll(): void {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers.clear();
  }

  private mapEventType(eventType: string): 'created' | 'modified' | 'deleted' {
    switch (eventType) {
      case 'rename':
        return 'created'; // ファイル作成時もrenameイベント
      case 'change':
        return 'modified';
      default:
        return 'modified';
    }
  }
}