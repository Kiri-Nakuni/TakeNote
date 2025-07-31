// 特殊化されたファイル操作
export { configFileManager } from './fileOperations/configFileManager';
export { tanFileManager } from './fileOperations/tanFileManager';
export type { 
  TanFileStructure, 
  TanMetadata, 
  TanMode, 
  TanHook, 
  DirectoryNode,
  HookKey,
  EmbeddingReference,
  CppCompilerOptions
} from './fileOperations/tanFileManager';

// TODO: 他のファイルマネージャーコンポーネントの実装後に追加
// export { fileManagerCore } from './fileManagerCore';
// export { DirectoryManager } from './DirectoryManager';
// export { FileOperations } from './FileOperations';
// export { PathResolver } from './PathResolver';
// export { FileSystemWatcher } from './FileSystemWatcher';
