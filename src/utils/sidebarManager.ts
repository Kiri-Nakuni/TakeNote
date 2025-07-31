/**
 * サイドバー管理クラス
 */

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
  size?: number;
  lastModified?: Date;
}

export interface SearchResult {
  id: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

export interface SidebarPanelState {
  activePanel: 'fileTree' | 'recentFiles' | 'search' | 'settings';
  isCollapsed: boolean;
  width: number;
  fileTree: {
    rootPath: string | null;
    nodes: FileTreeNode[];
    selectedNodeId: string | null;
    expandedNodeIds: Set<string>;
  };
  recentFiles: {
    files: string[];
    maxCount: number;
  };
  search: {
    query: string;
    results: SearchResult[];
    isSearching: boolean;
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
  };
}

export class SidebarManager {
  private static instance: SidebarManager;
  private state: SidebarPanelState;
  private eventCallbacks: Map<string, ((data: unknown) => void)[]>;

  private constructor() {
    this.state = {
      activePanel: 'fileTree',
      isCollapsed: false,
      width: 280,
      fileTree: {
        rootPath: null,
        nodes: [],
        selectedNodeId: null,
        expandedNodeIds: new Set()
      },
      recentFiles: {
        files: [],
        maxCount: 20
      },
      search: {
        query: '',
        results: [],
        isSearching: false,
        caseSensitive: false,
        wholeWord: false,
        useRegex: false
      }
    };

    this.eventCallbacks = new Map();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): SidebarManager {
    if (!SidebarManager.instance) {
      SidebarManager.instance = new SidebarManager();
    }
    return SidebarManager.instance;
  }

  /**
   * サイドバー状態を取得
   */
  getState(): SidebarPanelState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * アクティブパネルを設定
   */
  setActivePanel(panel: SidebarPanelState['activePanel']): void {
    if (this.state.activePanel !== panel) {
      this.state.activePanel = panel;
      this.emit('active-panel-changed', panel);
    }
  }

  /**
   * サイドバーの表示/非表示を切り替え
   */
  toggleCollapse(): void {
    this.state.isCollapsed = !this.state.isCollapsed;
    this.emit('collapse-toggled', this.state.isCollapsed);
  }

  /**
   * サイドバーの幅を設定
   */
  setWidth(width: number): void {
    const clampedWidth = Math.max(200, Math.min(600, width));
    if (this.state.width !== clampedWidth) {
      this.state.width = clampedWidth;
      this.emit('width-changed', clampedWidth);
    }
  }

  // ===== ファイルツリー関連 =====

  /**
   * ファイルツリーのルートパスを設定
   */
  setFileTreeRoot(rootPath: string): void {
    this.state.fileTree.rootPath = rootPath;
    this.state.fileTree.nodes = [];
    this.state.fileTree.selectedNodeId = null;
    this.state.fileTree.expandedNodeIds.clear();
    this.emit('file-tree-root-changed', rootPath);
  }

  /**
   * ファイルツリーにノードを追加
   */
  addFileTreeNodes(nodes: FileTreeNode[], parentPath?: string): void {
    if (!parentPath) {
      this.state.fileTree.nodes = nodes;
    } else {
      const parentNode = this.findNodeByPath(parentPath);
      if (parentNode) {
        parentNode.children = nodes;
      }
    }
    this.emit('file-tree-updated', this.state.fileTree.nodes);
  }

  /**
   * ノードの展開/折りたたみを切り替え
   */
  toggleNodeExpansion(nodeId: string): void {
    const node = this.findNodeById(nodeId);
    if (!node || node.type !== 'directory') return;

    if (this.state.fileTree.expandedNodeIds.has(nodeId)) {
      this.state.fileTree.expandedNodeIds.delete(nodeId);
      node.isExpanded = false;
    } else {
      this.state.fileTree.expandedNodeIds.add(nodeId);
      node.isExpanded = true;
    }

    this.emit('node-expansion-toggled', { nodeId, isExpanded: node.isExpanded });
  }

  /**
   * ノードを選択
   */
  selectNode(nodeId: string): void {
    // 前の選択を解除
    if (this.state.fileTree.selectedNodeId) {
      const prevNode = this.findNodeById(this.state.fileTree.selectedNodeId);
      if (prevNode) prevNode.isSelected = false;
    }

    // 新しいノードを選択
    const node = this.findNodeById(nodeId);
    if (node) {
      node.isSelected = true;
      this.state.fileTree.selectedNodeId = nodeId;
      this.emit('node-selected', node);
    }
  }

  /**
   * パスでノードを検索
   */
  private findNodeByPath(path: string): FileTreeNode | null {
    const findInNodes = (nodes: FileTreeNode[]): FileTreeNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
          const found = findInNodes(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInNodes(this.state.fileTree.nodes);
  }

  /**
   * IDでノードを検索
   */
  private findNodeById(id: string): FileTreeNode | null {
    const findInNodes = (nodes: FileTreeNode[]): FileTreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findInNodes(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInNodes(this.state.fileTree.nodes);
  }

  // ===== 最近のファイル関連 =====

  /**
   * 最近のファイルリストに追加
   */
  addRecentFile(filePath: string): void {
    const files = this.state.recentFiles.files;
    const existingIndex = files.indexOf(filePath);

    // 既存の場合は削除
    if (existingIndex > -1) {
      files.splice(existingIndex, 1);
    }

    // 先頭に追加
    files.unshift(filePath);

    // 最大数を超えた場合は削除
    if (files.length > this.state.recentFiles.maxCount) {
      files.splice(this.state.recentFiles.maxCount);
    }

    this.emit('recent-files-updated', files);
  }

  /**
   * 最近のファイルから削除
   */
  removeRecentFile(filePath: string): void {
    const files = this.state.recentFiles.files;
    const index = files.indexOf(filePath);
    if (index > -1) {
      files.splice(index, 1);
      this.emit('recent-files-updated', files);
    }
  }

  /**
   * 最近のファイルをクリア
   */
  clearRecentFiles(): void {
    this.state.recentFiles.files = [];
    this.emit('recent-files-updated', []);
  }

  // ===== 検索関連 =====

  /**
   * 検索クエリを設定
   */
  setSearchQuery(query: string): void {
    this.state.search.query = query;
    this.emit('search-query-changed', query);
  }

  /**
   * 検索オプションを設定
   */
  setSearchOptions(options: Partial<Pick<SidebarPanelState['search'], 'caseSensitive' | 'wholeWord' | 'useRegex'>>): void {
    Object.assign(this.state.search, options);
    this.emit('search-options-changed', options);
  }

  /**
   * 検索を実行（プレースホルダー実装 - 将来Elasticsearch統合予定）
   */
  async performSearch(): Promise<void> {
    if (!this.state.search.query.trim()) {
      this.state.search.results = [];
      this.emit('search-completed', []);
      return;
    }

    this.state.search.isSearching = true;
    this.emit('search-started');

    try {
      // TODO: Elasticsearch統合時にここを実装
      // 現在はプレースホルダー実装
      const results = await this.placeholderSearch();
      this.state.search.results = results;
      this.emit('search-completed', results);
    } catch (error) {
      console.error('Search failed:', error);
      this.emit('search-error', error);
    } finally {
      this.state.search.isSearching = false;
    }
  }

  /**
   * プレースホルダー検索実装（Elasticsearch統合までの暫定）
   */
  private async placeholderSearch(): Promise<SearchResult[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        // 暫定的な検索結果を返す
        const mockResults: SearchResult[] = [
          {
            id: 'placeholder_result',
            filePath: '/placeholder/search.txt',
            fileName: 'search.txt',
            lineNumber: 1,
            content: `プレースホルダー検索結果: "${this.state.search.query}"`,
            matchStart: 0,
            matchEnd: this.state.search.query.length
          }
        ];
        
        // 実際のクエリが入力されている場合のみ結果を返す
        if (this.state.search.query.length >= 2) {
          resolve(mockResults);
        } else {
          resolve([]);
        }
      }, 300); // 検索の感覚をシミュレート
    });
  }

  /**
   * 検索結果をクリア
   */
  clearSearchResults(): void {
    this.state.search.results = [];
    this.state.search.query = '';
    this.emit('search-cleared');
  }

  // ===== イベント管理 =====

  /**
   * イベントリスナーを追加
   */
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * イベントリスナーを削除
   */
  off(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * イベントを発行
   */
  private emit(event: string, data?: unknown): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in sidebar event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.state = {
      activePanel: 'fileTree',
      isCollapsed: false,
      width: 280,
      fileTree: {
        rootPath: null,
        nodes: [],
        selectedNodeId: null,
        expandedNodeIds: new Set()
      },
      recentFiles: {
        files: [],
        maxCount: 20
      },
      search: {
        query: '',
        results: [],
        isSearching: false,
        caseSensitive: false,
        wholeWord: false,
        useRegex: false
      }
    };
    this.emit('reset');
  }
}
