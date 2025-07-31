import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onMenuAction: (callback: (action: string) => void) => void
      removeMenuActionListener: () => void
      config: {
        get: () => Promise<Record<string, unknown>>
        update: (updates: Record<string, unknown>) => Promise<Record<string, unknown>>
        setSecurityMode: (mode: 'secure' | 'developer') => Promise<Record<string, unknown>>
        addRecentFile: (filePath: string) => Promise<Record<string, unknown>>
        updatePanelWidth: (panel: 'sidebar', width: number) => Promise<Record<string, unknown>>
        getSecurityMode: () => Promise<string>
        setLastOpenedFile: (filePath: string | null) => Promise<{ success: boolean; error?: string }>
        getLastOpenedFile: () => Promise<{ success: boolean; data?: string; error?: string }>
      }
      security: {
        isDeveloperMode: () => boolean
      }
      app: {
        restart: () => Promise<void>
        quit: () => Promise<void>
      }
      tan: {
        create: (filePath: string, tanFile: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
        read: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
        getInfo: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
        updateMetadata: (filePath: string, metadata: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
        updateContent: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
        exportToText: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
        isTanFile: (filePath: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
        showOpenDialog: () => Promise<{ success: boolean; data?: unknown; error?: string }>
        showSaveDialog: (defaultName?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
        createCppMode: (filePath: string, options: {
          title: string;
          description?: string;
          tags?: string[];
          compilerOptions?: Record<string, unknown>;
          initialCode?: string;
        }) => Promise<{ success: boolean; error?: string }>
        updateCppCompilerSettings: (filePath: string, compilerOptions: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
      }
      cppCompiler: {
        checkAvailability: () => Promise<{ success: boolean; available: boolean; error?: string }>
        compile: (request: {
          sourceCode: string;
          options: {
            standard: 'c++11' | 'c++14' | 'c++17' | 'c++20';
            optimization: 'O0' | 'O1' | 'O2' | 'O3';
            warnings: boolean;
            debug: boolean;
            includes?: string[];
            libraries?: string[];
          };
        }) => Promise<{
          success: boolean;
          wasmPath?: string;
          jsPath?: string;
          wasmBinary?: string; // Base64文字列
          errors?: string;
          warnings?: string;
          compileTimeMs: number;
        }>
        execute: (request: {
          wasmPath: string;
          jsPath: string;
          stdin: string;
        }) => Promise<{
          stdout: string;
          stderr: string;
          exitCode: number;
          executionTimeMs: number;
          memoryUsageKB: number;
          terminated: boolean;
        }>
        cleanup: () => Promise<{ success: boolean; error?: string }>
      }
      system: {
        getVersions: () => Promise<{
          electron: string;
          node: string;
          vite: string;
        }>
      }
      license: {
        getPackageLicenses: () => Promise<Array<{
          name: string;
          version: string;
          licenseType: string;
          repository: string;
          licenseFile: string;
        }>>
      }
      file: {
        showOpenDialog: (filters?: Array<{name: string, extensions: string[]}>) => Promise<{ success: boolean; data?: unknown; error?: string }>
        showSaveDialog: (defaultName?: string, filters?: Array<{name: string, extensions: string[]}>) => Promise<{ success: boolean; data?: unknown; error?: string }>
        read: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
        write: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
        create: (filePath: string, content?: string) => Promise<{ success: boolean; data?: string; error?: string }>
        createInFolder: (folderName: string, fileName: string, content?: string) => Promise<{ success: boolean; data?: string; error?: string }>
        delete: (filePath: string) => Promise<{ success: boolean; error?: string }>
        exists: (filePath: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
        getInfo: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
        listNotesDirectory: () => Promise<{ success: boolean; data?: unknown; error?: string }>
        createFolder: (folderName: string) => Promise<{ success: boolean; data?: string; error?: string }>
        listFolderContents: (folderPath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
      }
    }
  }
}
