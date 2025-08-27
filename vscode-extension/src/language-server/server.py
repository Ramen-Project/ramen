#!/usr/bin/env python3
"""
Ramen Language Server
Provides language intelligence features for .ramen files in VSCode
"""

import json
import sys
import asyncio
from typing import Optional, List, Dict, Any
from pathlib import Path

# Language Server Protocol imports
try:
    from pygls.server import LanguageServer
    from lsprotocol import types as lsp
except ImportError:
    print("pygls or lsprotocol not installed. Installing...", file=sys.stderr)
    import subprocess
    import shutil
    
    # Try using uv first, fallback to pip
    if shutil.which("uv"):
        try:
            subprocess.check_call(["uv", "add", "pygls", "lsprotocol"])
        except subprocess.CalledProcessError:
            # If uv fails, try uv pip install
            try:
                subprocess.check_call(["uv", "pip", "install", "pygls", "lsprotocol"])
            except subprocess.CalledProcessError:
                print("Failed to install with uv. Trying pip...", file=sys.stderr)
                subprocess.check_call([sys.executable, "-m", "pip", "install", "pygls", "lsprotocol"])
    else:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pygls", "lsprotocol"])
    
    # Try import again
    from pygls.server import LanguageServer
    from lsprotocol import types as lsp


class RamenLanguageServer(LanguageServer):
    """Language Server for Ramen graph files"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.graphs: Dict[str, Dict] = {}
        self.node_definitions = self.load_node_definitions()
        
    def load_node_definitions(self) -> Dict[str, Dict]:
        """Load available node definitions"""
        # This would be loaded from the Ramen backend
        # For now, return some example definitions
        return {
            "operator": {
                "name": "Operator Node",
                "description": "Basic arithmetic or logical operation",
                "inputs": ["a", "b"],
                "outputs": ["result"],
                "parameters": ["operation"]
            },
            "reference": {
                "name": "Reference Node",
                "description": "References another node's output",
                "inputs": [],
                "outputs": ["value"],
                "parameters": ["target"]
            },
            "group": {
                "name": "Group Node",
                "description": "Groups multiple nodes together",
                "inputs": [],
                "outputs": [],
                "parameters": []
            },
            "input": {
                "name": "Input Node",
                "description": "Graph input parameter",
                "inputs": [],
                "outputs": ["value"],
                "parameters": ["name", "type", "default"]
            },
            "output": {
                "name": "Output Node",
                "description": "Graph output result",
                "inputs": ["value"],
                "outputs": [],
                "parameters": ["name"]
            }
        }


server = RamenLanguageServer("ramen-language-server", "v0.1.0")


@server.feature(lsp.TEXT_DOCUMENT_DID_OPEN)
async def did_open(ls: RamenLanguageServer, params: lsp.DidOpenTextDocumentParams):
    """Called when a .ramen file is opened"""
    uri = params.text_document.uri
    content = params.text_document.text
    
    try:
        graph = json.loads(content)
        ls.graphs[uri] = graph
        
        # Validate graph structure
        await validate_graph(ls, uri, graph)
    except json.JSONDecodeError as e:
        ls.show_message_log(f"Invalid JSON in {uri}: {e}")
        # Send diagnostic for JSON error
        await send_json_error_diagnostic(ls, uri, str(e))


@server.feature(lsp.TEXT_DOCUMENT_DID_CHANGE)
async def did_change(ls: RamenLanguageServer, params: lsp.DidChangeTextDocumentParams):
    """Called when a .ramen file is modified"""
    uri = params.text_document.uri
    
    for change in params.content_changes:
        try:
            graph = json.loads(change.text)
            ls.graphs[uri] = graph
            
            # Clear diagnostics and revalidate
            ls.publish_diagnostics(uri, [])
            await validate_graph(ls, uri, graph)
        except json.JSONDecodeError as e:
            ls.show_message_log(f"Invalid JSON in {uri}: {e}")
            await send_json_error_diagnostic(ls, uri, str(e))


@server.feature(lsp.TEXT_DOCUMENT_DID_SAVE)
async def did_save(ls: RamenLanguageServer, params: lsp.DidSaveTextDocumentParams):
    """Called when a .ramen file is saved"""
    uri = params.text_document.uri
    ls.show_message_log(f"Graph saved: {uri}")


@server.feature(lsp.TEXT_DOCUMENT_COMPLETION)
async def completions(ls: RamenLanguageServer, params: lsp.CompletionParams) -> lsp.CompletionList:
    """Provide completion suggestions"""
    items = []
    
    # Provide node type completions
    for node_type, definition in ls.node_definitions.items():
        item = lsp.CompletionItem(
            label=node_type,
            detail=definition["name"],
            documentation=definition["description"],
            insert_text=json.dumps({
                "type": node_type,
                "id": f"{node_type}_1",
                "name": definition["name"],
                "inputs": [{"name": inp, "typeId": "any"} for inp in definition["inputs"]],
                "outputs": [{"name": out, "typeId": "any"} for out in definition["outputs"]],
                "position": {"x": 0, "y": 0},
                "data": {}
            }, indent=2)
        )
        items.append(item)
    
    return lsp.CompletionList(
        is_incomplete=False,
        items=items
    )


@server.feature(lsp.TEXT_DOCUMENT_HOVER)
async def hover(ls: RamenLanguageServer, params: lsp.HoverParams) -> Optional[lsp.Hover]:
    """Provide hover information"""
    uri = params.text_document.uri
    
    if uri not in ls.graphs:
        return None
    
    graph = ls.graphs[uri]
    
    # Find what's under the cursor
    # This is simplified - in a real implementation, we'd parse the JSON structure
    # to find the exact element at the position
    
    content = lsp.MarkupContent(
        kind=lsp.MarkupKind.Markdown,
        value=f"**Ramen Graph**\n\n" +
              f"- Nodes: {len(graph.get('nodes', []))}\n" +
              f"- Edges: {len(graph.get('edges', []))}\n" +
              f"- Version: {graph.get('version', 'unknown')}"
    )
    
    return lsp.Hover(contents=content)


@server.feature(lsp.TEXT_DOCUMENT_DOCUMENT_SYMBOL)
async def document_symbols(ls: RamenLanguageServer, params: lsp.DocumentSymbolParams) -> List[lsp.DocumentSymbol]:
    """Provide document symbols (nodes, edges, etc.)"""
    uri = params.text_document.uri
    
    if uri not in ls.graphs:
        return []
    
    graph = ls.graphs[uri]
    symbols = []
    
    # Add nodes as symbols
    for node in graph.get("nodes", []):
        symbol = lsp.DocumentSymbol(
            name=node.get("name", node.get("id", "unknown")),
            kind=lsp.SymbolKind.Class,
            range=lsp.Range(
                start=lsp.Position(line=0, character=0),
                end=lsp.Position(line=0, character=0)
            ),
            selection_range=lsp.Range(
                start=lsp.Position(line=0, character=0),
                end=lsp.Position(line=0, character=0)
            ),
            detail=f"Node: {node.get('type', 'unknown')}"
        )
        symbols.append(symbol)
    
    # Add edges as symbols
    for edge in graph.get("edges", []):
        symbol = lsp.DocumentSymbol(
            name=f"{edge.get('source', '?')} → {edge.get('target', '?')}",
            kind=lsp.SymbolKind.Variable,
            range=lsp.Range(
                start=lsp.Position(line=0, character=0),
                end=lsp.Position(line=0, character=0)
            ),
            selection_range=lsp.Range(
                start=lsp.Position(line=0, character=0),
                end=lsp.Position(line=0, character=0)
            ),
            detail="Edge"
        )
        symbols.append(symbol)
    
    return symbols


@server.feature(lsp.TEXT_DOCUMENT_FORMATTING)
async def formatting(ls: RamenLanguageServer, params: lsp.DocumentFormattingParams) -> List[lsp.TextEdit]:
    """Format the document (pretty-print JSON)"""
    uri = params.text_document.uri
    
    if uri not in ls.graphs:
        return []
    
    graph = ls.graphs[uri]
    
    # Format with proper indentation
    formatted = json.dumps(graph, indent=2, sort_keys=False)
    
    # Return text edit to replace entire document
    document = ls.workspace.get_text_document(uri)
    return [
        lsp.TextEdit(
            range=lsp.Range(
                start=lsp.Position(line=0, character=0),
                end=lsp.Position(line=len(document.source.split('\n')), character=0)
            ),
            new_text=formatted
        )
    ]


async def validate_graph(ls: RamenLanguageServer, uri: str, graph: Dict):
    """Validate graph structure and send diagnostics"""
    diagnostics = []
    
    # Check for required fields
    if "version" not in graph:
        # Add warning diagnostic
        pass
    
    # Validate nodes
    nodes = graph.get("nodes", [])
    node_ids = set()
    
    for node in nodes:
        node_id = node.get("id")
        if not node_id:
            # Add error diagnostic
            pass
        elif node_id in node_ids:
            # Duplicate node ID
            pass
        else:
            node_ids.add(node_id)
    
    # Validate edges
    edges = graph.get("edges", [])
    
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        
        if source not in node_ids:
            # Invalid source node
            pass
        if target not in node_ids:
            # Invalid target node
            pass
    
    # Send diagnostics
    ls.publish_diagnostics(uri, diagnostics)


async def send_json_error_diagnostic(ls: RamenLanguageServer, uri: str, error: str):
    """Send diagnostic for JSON parsing error"""
    # This would parse the error message to find line/column
    # For now, just log it
    ls.show_message_log(f"JSON error in {uri}: {error}")


def main():
    """Main entry point"""
    server.start_io()


if __name__ == "__main__":
    main()