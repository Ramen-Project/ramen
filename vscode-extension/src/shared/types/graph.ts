/**
 * 圖形資料結構定義
 * 前後端統一的 Graph, Node, Edge 類型
 */

import { Position, UUID, Timestamp, Color, IconName } from './common';

/**
 * 節點端口類型
 */
export enum PortType {
    INPUT = 'input',
    OUTPUT = 'output',
}

/**
 * 資料類型
 */
export enum DataType {
    ANY = 'any',
    STRING = 'str',
    NUMBER = 'int',
    FLOAT = 'float',
    BOOLEAN = 'bool',
    LIST = 'list',
    DICT = 'dict',
    TUPLE = 'tuple',
    NONE = 'None',
}

/**
 * 端口定義
 */
export interface PortData {
    id: string;
    name: string;
    type: PortType;
    data_type: DataType | string;
    label?: string;
    default_value?: any;
    required?: boolean;
    description?: string;
}

/**
 * 節點元數據
 */
export interface NodeMetadata {
    type: string;
    name: string;
    namespace: string;
    description: string;
    icon?: IconName;
    color?: Color;
    category?: string;
    version?: string;
}

/**
 * 節點資料
 */
export interface NodeData {
    id: UUID;
    type: string;
    position: Position;
    data: Record<string, any>;
    metadata?: NodeMetadata;
    inputs?: PortData[];
    outputs?: PortData[];
}

/**
 * 邊資料
 */
export interface EdgeData {
    id: UUID;
    source: UUID;
    source_handle: string;
    target: UUID;
    target_handle: string;
    animated?: boolean;
    style?: Record<string, any>;
}

/**
 * 圖形元數據
 */
export interface GraphMetadata {
    name: string;
    description?: string;
    version?: string;
    author?: string;
    created_at?: Timestamp;
    last_modified?: Timestamp;
    tags?: string[];
}

/**
 * 變數定義
 */
export interface Variable {
    name: string;
    type: DataType | string;
    value: any;
    description?: string;
}

/**
 * 完整的圖形資料
 */
export interface GraphData {
    id: UUID;
    metadata: GraphMetadata;
    nodes: NodeData[];
    edges: EdgeData[];
    variables?: Variable[];
}

/**
 * .ramen 檔案格式
 */
export interface RamenFileHeader {
    format: string;
    version: string;
    created_at: Timestamp;
}

export interface RamenFile {
    header: RamenFileHeader;
    graph: GraphData;
}

/**
 * 圖形依賴
 */
export interface GraphDependencies {
    toppings: string[];
    python_packages: string[];
}
