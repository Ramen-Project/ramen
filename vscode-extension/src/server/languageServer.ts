import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    Hover,
    MarkupKind,
    Diagnostic,
    DiagnosticSeverity,
    DidChangeConfigurationNotification,
    DocumentFormattingParams,
    TextEdit,
    DefinitionParams,
    Definition,
    Location,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create connection
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

// Node type definitions
const nodeTypes = [
    { label: 'Input', kind: CompletionItemKind.Class, detail: 'Input node for data entry' },
    { label: 'Output', kind: CompletionItemKind.Class, detail: 'Output node for results' },
    { label: 'Process', kind: CompletionItemKind.Class, detail: 'Process node for operations' },
    { label: 'Function', kind: CompletionItemKind.Function, detail: 'Custom function node' },
    { label: 'Variable', kind: CompletionItemKind.Variable, detail: 'Variable storage node' },
    { label: 'Condition', kind: CompletionItemKind.Class, detail: 'Conditional logic node' },
    { label: 'Loop', kind: CompletionItemKind.Class, detail: 'Loop control node' },
    { label: 'ClassDefinition', kind: CompletionItemKind.Class, detail: 'Class definition node' },
    { label: 'PydanticModel', kind: CompletionItemKind.Class, detail: 'Pydantic model node' },
    { label: 'TorchModule', kind: CompletionItemKind.Class, detail: 'PyTorch module node' },
];

// Graph schema
interface GraphNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

interface Graph {
    version: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata?: Record<string, unknown>;
}

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['"', '.', ':'],
            },
            hoverProvider: true,
            documentFormattingProvider: true,
            definitionProvider: true,
            diagnosticProvider: {
                interFileDependencies: false,
                workspaceDiagnostics: false,
            },
        },
    };

    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        };
    }

    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

// Settings interface
interface RamenSettings {
    maxNumberOfProblems: number;
    validateOnType: boolean;
}

const defaultSettings: RamenSettings = {
    maxNumberOfProblems: 100,
    validateOnType: true,
};
let globalSettings: RamenSettings = defaultSettings;

// Cache document settings
const documentSettings: Map<string, Thenable<RamenSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
        documentSettings.clear();
    } else {
        globalSettings = <RamenSettings>(change.settings.ramenLanguageServer || defaultSettings);
    }

    // Revalidate all open documents
    documents.all().forEach(validateAndSendDiagnostics);
});

function getDocumentSettings(resource: string): Thenable<RamenSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace
            .getConfiguration({
                scopeUri: resource,
                section: 'ramenLanguageServer',
            })
            .then((config) => {
                // Ensure we always return valid settings with defaults
                return config || defaultSettings;
            });
        documentSettings.set(resource, result);
    }
    return result;
}

// Document change handling
documents.onDidClose((e) => {
    documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent((change) => {
    validateAndSendDiagnostics(change.document);
});

// Validation - internal function that returns diagnostics
async function validateDocument(
    textDocument: TextDocument,
    settings?: RamenSettings
): Promise<Diagnostic[]> {
    if (!settings) {
        settings = await getDocumentSettings(textDocument.uri);
    }
    // Ensure settings is never null/undefined
    settings = settings || defaultSettings;
    const text = textDocument.getText();
    const diagnostics: Diagnostic[] = [];

    try {
        const graph: Graph = JSON.parse(text);

        // Validate graph structure
        if (!graph.version) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: textDocument.positionAt(0),
                    end: textDocument.positionAt(text.length),
                },
                message: 'Graph must have a version field',
                source: 'ramen',
            });
        }

        // Validate nodes
        if (graph.nodes) {
            const nodeIds = new Set<string>();

            for (let i = 0; i < graph.nodes.length; i++) {
                const node = graph.nodes[i];

                // Check for duplicate IDs
                if (nodeIds.has(node.id)) {
                    const nodeText = JSON.stringify(node);
                    const index = text.indexOf(nodeText);
                    if (index !== -1) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: {
                                start: textDocument.positionAt(index),
                                end: textDocument.positionAt(index + nodeText.length),
                            },
                            message: `Duplicate node ID: ${node.id}`,
                            source: 'ramen',
                            code: 'duplicate-node-id',
                        });
                    }
                }
                nodeIds.add(node.id);

                // Validate node type
                if (!node.type) {
                    const nodeText = JSON.stringify(node);
                    const index = text.indexOf(nodeText);
                    if (index !== -1) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: {
                                start: textDocument.positionAt(index),
                                end: textDocument.positionAt(index + nodeText.length),
                            },
                            message:
                                'Node must have a type. Available types: ' +
                                nodeTypes.map((t) => t.label).join(', '),
                            source: 'ramen',
                            code: 'missing-node-type',
                        });
                    }
                } else {
                    // Validate node type exists
                    const validTypes = nodeTypes.map((t) => t.label);
                    if (!validTypes.includes(node.type)) {
                        const index = text.indexOf(`"type": "${node.type}"`);
                        if (index !== -1) {
                            diagnostics.push({
                                severity: DiagnosticSeverity.Warning,
                                range: {
                                    start: textDocument.positionAt(index),
                                    end: textDocument.positionAt(
                                        index + `"type": "${node.type}"`.length
                                    ),
                                },
                                message: `Unknown node type '${node.type}'. Available types: ${validTypes.join(', ')}`,
                                source: 'ramen',
                                code: 'unknown-node-type',
                            });
                        }
                    }
                }
            }
        }

        // Validate edges
        if (graph.edges) {
            const nodeIds = new Set(graph.nodes?.map((n) => n.id) || []);

            for (const edge of graph.edges) {
                // Check if source and target exist
                if (!nodeIds.has(edge.source)) {
                    const edgeText = JSON.stringify(edge);
                    const index = text.indexOf(edgeText);
                    if (index !== -1) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: {
                                start: textDocument.positionAt(index),
                                end: textDocument.positionAt(index + edgeText.length),
                            },
                            message: `Edge source node not found: ${edge.source}`,
                            source: 'ramen',
                            code: 'invalid-connection',
                        });
                    }
                }

                if (!nodeIds.has(edge.target)) {
                    const edgeText = JSON.stringify(edge);
                    const index = text.indexOf(edgeText);
                    if (index !== -1) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: {
                                start: textDocument.positionAt(index),
                                end: textDocument.positionAt(index + edgeText.length),
                            },
                            message: `Edge target node not found: ${edge.target}`,
                            source: 'ramen',
                            code: 'invalid-connection',
                        });
                    }
                }
            }
        }

        // Limit number of problems
        const maxProblems = settings?.maxNumberOfProblems ?? defaultSettings.maxNumberOfProblems;
        if (diagnostics.length > maxProblems) {
            diagnostics.length = maxProblems;
        }
    } catch (error) {
        // JSON parse error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const match = /at position (\d+)/.exec(errorMessage);
        const position = match ? parseInt(match[1]) : 0;

        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: textDocument.positionAt(position),
                end: textDocument.positionAt(Math.min(position + 20, text.length)),
            },
            message: `JSON parse error: ${errorMessage}`,
            source: 'ramen',
        });
    }

    return diagnostics;
}

// Send diagnostics helper - calls validateDocument and sends results
async function validateAndSendDiagnostics(textDocument: TextDocument): Promise<void> {
    const diagnostics = await validateDocument(textDocument);
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Completion
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const completions: CompletionItem[] = [];

    // Get context around cursor position
    const lineText = document.getText({
        start: { line: params.position.line, character: 0 },
        end: { line: params.position.line, character: params.position.character },
    });

    // Context-aware completions
    if (lineText.includes('"type":')) {
        // Completing node type value
        for (const nodeType of nodeTypes) {
            completions.push({
                label: nodeType.label,
                kind: nodeType.kind,
                detail: nodeType.detail,
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `**${nodeType.label}**\\n\\n${nodeType.detail}`,
                },
                insertText: nodeType.label,
            });
        }
        return completions;
    }

    // Add node type completions for general context
    for (const nodeType of nodeTypes) {
        completions.push({
            label: nodeType.label,
            kind: nodeType.kind,
            detail: nodeType.detail,
            documentation: {
                kind: MarkupKind.Markdown,
                value: `Insert a ${nodeType.label} node`,
            },
        });
    }

    // Add common properties
    completions.push(
        {
            label: 'id',
            kind: CompletionItemKind.Property,
            detail: 'Node or edge identifier',
            insertText: '"id": "$1"',
        },
        {
            label: 'type',
            kind: CompletionItemKind.Property,
            detail: 'Node type',
            insertText: '"type": "$1"',
        },
        {
            label: 'position',
            kind: CompletionItemKind.Property,
            detail: 'Node position',
            insertText: '"position": { "x": $1, "y": $2 }',
        },
        {
            label: 'data',
            kind: CompletionItemKind.Property,
            detail: 'Node data',
            insertText: '"data": { $1 }',
        },
        {
            label: 'source',
            kind: CompletionItemKind.Property,
            detail: 'Edge source node',
            insertText: '"source": "$1"',
        },
        {
            label: 'target',
            kind: CompletionItemKind.Property,
            detail: 'Edge target node',
            insertText: '"target": "$1"',
        }
    );

    return completions;
});

// Hover
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    const text = document.getText();
    const offset = document.offsetAt(params.position);

    // Find the word at position
    let start = offset;
    let end = offset;

    while (start > 0 && /[a-zA-Z0-9_-]/.test(text[start - 1])) {
        start--;
    }

    while (end < text.length && /[a-zA-Z0-9_-]/.test(text[end])) {
        end++;
    }

    const word = text.substring(start, end);

    // Check if it's a node type
    const nodeType = nodeTypes.find((t) => t.label === word);
    if (nodeType) {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${nodeType.label}**\n\n${nodeType.detail}`,
            },
            range: {
                start: document.positionAt(start),
                end: document.positionAt(end),
            },
        };
    }

    // Check for keywords
    const keywords: Record<string, string> = {
        nodes: 'Array of graph nodes',
        edges: 'Array of graph connections',
        metadata: 'Graph metadata information',
        version: 'Graph format version',
        position: 'Node position in the canvas',
        data: 'Node-specific data and configuration',
    };

    if (keywords[word]) {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${word}**\n\n${keywords[word]}`,
            },
            range: {
                start: document.positionAt(start),
                end: document.positionAt(end),
            },
        };
    }

    return null;
});

// Format document
connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const text = document.getText();

    try {
        const parsed = JSON.parse(text);
        const formatted = JSON.stringify(parsed, null, 2);

        return [
            {
                range: {
                    start: document.positionAt(0),
                    end: document.positionAt(text.length),
                },
                newText: formatted,
            },
        ];
    } catch {
        // Unable to format invalid JSON
        return [];
    }
});

// Go to definition
connection.onDefinition((params: DefinitionParams): Definition | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    const text = document.getText();

    try {
        const graph: Graph = JSON.parse(text);
        const offset = document.offsetAt(params.position);

        // Find what we're looking at
        let start = offset;
        let end = offset;

        while (start > 0 && /[a-zA-Z0-9_-]/.test(text[start - 1])) {
            start--;
        }

        while (end < text.length && /[a-zA-Z0-9_-]/.test(text[end])) {
            end++;
        }

        const word = text.substring(start, end);

        // Check if it's a node ID reference in an edge
        if (graph.nodes) {
            for (const node of graph.nodes) {
                if (node.id === word) {
                    // Find the node definition
                    const nodeText = `"id": "${node.id}"`;
                    const nodeIndex = text.indexOf(nodeText);

                    if (nodeIndex !== -1) {
                        return Location.create(params.textDocument.uri, {
                            start: document.positionAt(nodeIndex),
                            end: document.positionAt(nodeIndex + nodeText.length),
                        });
                    }
                }
            }
        }
    } catch {
        // Invalid JSON
    }

    return null;
});

// Handle diagnostic pull requests (LSP 3.17+)
// Using onRequest to handle the method directly
connection.onRequest('textDocument/diagnostic', async (params: any) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return { kind: 'full', items: [] };
    }

    // Reuse the validation logic
    const settings = await getDocumentSettings(params.textDocument.uri);
    const diagnostics = await validateDocument(document, settings);

    return {
        kind: 'full',
        items: diagnostics,
    };
});

// Listen to document changes
documents.listen(connection);

// Start listening
connection.listen();
