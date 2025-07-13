import { PreviewNodeProps } from "../components/Node/NodePreview";

// Mapping from Node Library categories to node namespaces
const CATEGORY_TO_NAMESPACE: Record<string, string> = {
    'File I/O': 'FileIO',
    'Data Operations': 'DataOps',
    'Math & Statistics': 'Math',
    'Machine Learning': 'MachineLearning',
    'Data Visualization': 'DataOps',
    'Text Processing': 'TextProcessing',
    'Web & API': 'WebAPI',
    'Image Processing': 'ImageProcessing',
    'Time Series': 'TimeSeries',
    'Database': 'Database',
    'Automation': 'Automation',
    'Data Quality': 'DataQuality',
    'Utilities': 'Utilities'
};

// Sample input/output data based on node type and category
const generateSamplePorts = (nodeName: string, category: string) => {
    const namespace = CATEGORY_TO_NAMESPACE[category] || 'Utilities';
    
    // Common input/output patterns by category
    switch (category) {
        case 'File I/O':
            if (nodeName.startsWith('Read')) {
                return {
                    inputs: [{ name: 'filePath', typeId: 'str' }],
                    outputs: [
                        { name: 'data', typeId: 'list' },
                        { name: 'success', typeId: 'bool' }
                    ]
                };
            } else if (nodeName.startsWith('Write')) {
                return {
                    inputs: [
                        { name: 'data', typeId: 'list' },
                        { name: 'filePath', typeId: 'str' }
                    ],
                    outputs: [
                        { name: 'success', typeId: 'bool' },
                        { name: 'fileSize', typeId: 'int' }
                    ]
                };
            }
            break;
            
        case 'Data Operations':
            return {
                inputs: [
                    { name: 'data', typeId: 'list' },
                    { name: 'config', typeId: 'dict' }
                ],
                outputs: [
                    { name: 'result', typeId: 'list' },
                    { name: 'count', typeId: 'int' }
                ]
            };
            
        case 'Math & Statistics':
            return {
                inputs: [
                    { name: 'values', typeId: 'list' },
                    { name: 'axis', typeId: 'int' }
                ],
                outputs: [
                    { name: 'result', typeId: 'float' },
                    { name: 'stats', typeId: 'dict' }
                ]
            };
            
        case 'Machine Learning':
            if (nodeName.includes('Train')) {
                return {
                    inputs: [
                        { name: 'X_train', typeId: 'list' },
                        { name: 'y_train', typeId: 'list' },
                        { name: 'params', typeId: 'dict' }
                    ],
                    outputs: [
                        { name: 'model', typeId: 'dict' },
                        { name: 'accuracy', typeId: 'float' }
                    ]
                };
            } else if (nodeName.includes('Predict')) {
                return {
                    inputs: [
                        { name: 'model', typeId: 'dict' },
                        { name: 'X_test', typeId: 'list' }
                    ],
                    outputs: [
                        { name: 'predictions', typeId: 'list' },
                        { name: 'confidence', typeId: 'list' }
                    ]
                };
            }
            break;
            
        case 'Data Visualization':
            return {
                inputs: [
                    { name: 'data', typeId: 'list' },
                    { name: 'x_col', typeId: 'str' },
                    { name: 'y_col', typeId: 'str' }
                ],
                outputs: [
                    { name: 'chart', typeId: 'dict' },
                    { name: 'saved', typeId: 'bool' }
                ]
            };
            
        case 'Text Processing':
            return {
                inputs: [
                    { name: 'text', typeId: 'str' },
                    { name: 'options', typeId: 'dict' }
                ],
                outputs: [
                    { name: 'processed', typeId: 'str' },
                    { name: 'tokens', typeId: 'list' }
                ]
            };
            
        case 'Web & API':
            return {
                inputs: [
                    { name: 'url', typeId: 'str' },
                    { name: 'headers', typeId: 'dict' }
                ],
                outputs: [
                    { name: 'response', typeId: 'dict' },
                    { name: 'status', typeId: 'int' }
                ]
            };
            
        case 'Image Processing':
            return {
                inputs: [
                    { name: 'image', typeId: 'str' },
                    { name: 'params', typeId: 'dict' }
                ],
                outputs: [
                    { name: 'result', typeId: 'str' },
                    { name: 'metadata', typeId: 'dict' }
                ]
            };
            
        case 'Time Series':
            return {
                inputs: [
                    { name: 'timeseries', typeId: 'list' },
                    { name: 'window', typeId: 'int' }
                ],
                outputs: [
                    { name: 'forecast', typeId: 'list' },
                    { name: 'metrics', typeId: 'dict' }
                ]
            };
            
        case 'Database':
            return {
                inputs: [
                    { name: 'query', typeId: 'str' },
                    { name: 'connection', typeId: 'str' }
                ],
                outputs: [
                    { name: 'result', typeId: 'list' },
                    { name: 'rowCount', typeId: 'int' }
                ]
            };
            
        case 'Automation':
            return {
                inputs: [
                    { name: 'trigger', typeId: 'dict' },
                    { name: 'config', typeId: 'dict' }
                ],
                outputs: [
                    { name: 'success', typeId: 'bool' },
                    { name: 'log', typeId: 'str' }
                ]
            };
            
        case 'Data Quality':
            return {
                inputs: [
                    { name: 'data', typeId: 'list' },
                    { name: 'rules', typeId: 'dict' }
                ],
                outputs: [
                    { name: 'report', typeId: 'dict' },
                    { name: 'score', typeId: 'float' }
                ]
            };
            
        default: // Utilities
            return {
                inputs: [
                    { name: 'input', typeId: 'str' }
                ],
                outputs: [
                    { name: 'output', typeId: 'str' }
                ]
            };
    }
    
    // Default fallback
    return {
        inputs: [{ name: 'input', typeId: 'str' }],
        outputs: [{ name: 'output', typeId: 'str' }]
    };
};

export const createNodePreviewData = (
    nodeName: string, 
    nodeDescription: string, 
    categoryName: string
): PreviewNodeProps => {
    const namespace = CATEGORY_TO_NAMESPACE[categoryName] || 'Utilities';
    const ports = generateSamplePorts(nodeName, categoryName);
    
    return {
        name: nodeName,
        namespace: namespace,
        brief: nodeDescription,
        inputs: ports.inputs,
        outputs: ports.outputs
    };
};