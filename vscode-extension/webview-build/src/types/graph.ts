/**
 * 圖形模型類型定義
 * 定義了 Ramen 中圖形、節點、邊和埠的核心數據結構
 */

// 基本類型
export type NodeId = string;
export type EdgeId = string;
export type PortId = string;
export type TypeId = string;

/**
 * 位置信息
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 尺寸信息
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * 埠定義
 */
export interface Port {
  /** 埠唯一識別符 */
  id: PortId;
  /** 埠名稱 */
  name: string;
  /** 數據類型 ID */
  typeId: TypeId;
  /** 是否為輸入埠 */
  isInput: boolean;
  /** 埠描述 */
  description?: string;
  /** 是否為可選埠 */
  optional?: boolean;
  /** 預設值 */
  defaultValue?: any;
}

/**
 * 節點元數據
 */
export interface NodeMetadata {
  /** 節點類型 */
  type: 'operator' | 'variable' | 'constant' | 'group' | 'comment';
  /** 節點名稱 */
  name: string;
  /** 命名空間 */
  namespace: string;
  /** 節點描述 */
  description?: string;
  /** 節點分類 */
  category?: string;
  /** 節點版本 */
  version?: string;
}

/**
 * 節點定義
 */
export interface RamenNode {
  /** 節點唯一識別符 */
  id: NodeId;
  /** 節點元數據 */
  metadata: NodeMetadata;
  /** 節點位置 */
  position: Position;
  /** 節點尺寸 */
  size?: Size;
  /** 輸入埠列表 */
  inputs: Port[];
  /** 輸出埠列表 */
  outputs: Port[];
  /** 父節點 ID (用於群組) */
  parentId?: NodeId;
  /** 節點配置 */
  config?: Record<string, any>;
  /** 節點狀態 */
  state?: 'idle' | 'running' | 'completed' | 'error';
  /** 是否選中 */
  selected?: boolean;
  /** 是否可見 */
  visible?: boolean;
  /** 自定義數據 */
  data?: Record<string, any>;
}

/**
 * 邊定義
 */
export interface RamenEdge {
  /** 邊唯一識別符 */
  id: EdgeId;
  /** 源節點 ID */
  sourceNodeId: NodeId;
  /** 源埠 ID */
  sourcePortId: PortId;
  /** 目標節點 ID */
  targetNodeId: NodeId;
  /** 目標埠 ID */
  targetPortId: PortId;
  /** 邊標籤 */
  label?: string;
  /** 是否選中 */
  selected?: boolean;
  /** 是否可見 */
  visible?: boolean;
  /** 邊樣式 */
  style?: {
    color?: string;
    width?: number;
    dash?: number[];
  };
  /** 自定義數據 */
  data?: Record<string, any>;
}

/**
 * 變數定義
 */
export interface Variable {
  /** 變數 ID */
  id: string;
  /** 變數名稱 */
  name: string;
  /** 數據類型 */
  typeId: TypeId;
  /** 變數值 */
  value?: any;
  /** 變數描述 */
  description?: string;
  /** 是否為常數 */
  constant?: boolean;
}

/**
 * 圖形元數據
 */
export interface GraphMetadata {
  /** 圖形名稱 */
  name: string;
  /** 圖形描述 */
  description?: string;
  /** 版本號 */
  version: string;
}

/**
 * 圖形定義
 */
export interface RamenGraph {
  /** 圖形唯一識別符 */
  id: string;
  /** 圖形元數據 */
  metadata: GraphMetadata;
  /** 節點列表 */
  nodes: RamenNode[];
  /** 邊列表 */
  edges: RamenEdge[];
  /** 變數註冊表 */
  variables: Variable[];
  /** 檢視狀態 */
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  /** 圖形配置 */
  config?: Record<string, any>;
}

/**
 * 專案定義
 */
export interface RamenProject {
  /** 專案唯一識別符 */
  id: string;
  /** 專案名稱 */
  name: string;
  /** 專案描述 */
  description?: string;
  /** 圖形列表 */
  graphs: RamenGraph[];
  /** 專案配置 */
  config?: {
    /** Python 環境配置 */
    python?: {
      version?: string;
      dependencies?: string[];
    };
    /** 專案設定 */
    settings?: Record<string, any>;
  };
  /** 創建時間 */
  createdAt: string;
  /** 最後修改時間 */
  lastModified: string;
  /** 版本號 */
  version: string;
}

/**
 * 類型註冊表
 */
export interface TypeRegistry {
  [typeId: string]: {
    /** 類型名稱 */
    name: string;
    /** 類型顏色 */
    color: string;
    /** 類型描述 */
    description?: string;
    /** Python 類型對應 */
    pythonType?: string;
  };
}

/**
 * 序列化格式版本
 */
export const GRAPH_FORMAT_VERSION = '1.0.0';

/**
 * 檔案格式標識
 */
export interface RamenFileHeader {
  /** 檔案格式標識 */
  format: 'ramen-graph' | 'ramen-project';
  /** 格式版本 */
  version: string;
  /** 創建時間 */
  createdAt: string;
  /** 應用程式版本 */
  appVersion?: string;
}

/**
 * .ramen 檔案格式 (單一圖形)
 */
export interface RamenGraphFile {
  /** 檔案標頭 */
  header: RamenFileHeader;
  /** 圖形數據 */
  graph: RamenGraph;
}

/**
 * .ramen-project 檔案格式 (專案)
 */
export interface RamenProjectFile {
  /** 檔案標頭 */
  header: RamenFileHeader;
  /** 專案數據 */
  project: RamenProject;
}