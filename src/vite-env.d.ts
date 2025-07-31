/// <reference types="vite/client" />
/// <reference types="vue/macros-global" />

// Vue.jsの型宣言
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// パスエイリアスの型定義は不要 - TypeScriptのパス解決でカバー

// その他のアセット型定義
declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.gif' {
  const content: string
  export default content
}

declare module '*.webp' {
  const content: string
  export default content
}

// Electron API の型定義
declare global {
  interface Window {
    electron: import('@electron-toolkit/preload').ElectronAPI
    api: {
      onMenuAction: (callback: (action: string) => void) => void
      removeMenuActionListener: () => void
      config: {
        get: () => Promise<Record<string, unknown>>
        update: (updates: Record<string, unknown>) => Promise<Record<string, unknown>>
        setSecurityMode: (mode: 'secure' | 'developer') => Promise<Record<string, unknown>>
        addRecentFile: (filePath: string) => Promise<Record<string, unknown>>
        updatePanelWidth: (panel: 'sidebar', width: number) => Promise<Record<string, unknown>>
        getSecurityMode: () => Promise<Record<string, unknown>>
        getNotesDirectory: () => Promise<string>
        getNotePath: (fileName: string) => Promise<string>
      }
      security: {
        isDeveloperMode: () => boolean
      }
      app: {
        restart: () => Promise<void>
        quit: () => Promise<void>
      }
      file: {
        showOpenDialog: (filters?: Array<{name: string, extensions: string[]}>) => Promise<{ success: boolean; data?: unknown; error?: string }>
        showSaveDialog: (defaultName?: string, filters?: Array<{name: string, extensions: string[]}>) => Promise<{ success: boolean; data?: unknown; error?: string }>
        read: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
        write: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
        create: (filePath: string, content?: string) => Promise<{ success: boolean; data?: string; error?: string }>
        delete: (filePath: string) => Promise<{ success: boolean; error?: string }>
        exists: (filePath: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
        getInfo: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
        listNotesDirectory: () => Promise<{ success: boolean; data?: unknown; error?: string }>
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
      }
    }
  }
}
