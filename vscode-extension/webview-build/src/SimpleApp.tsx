import { useEffect, useState } from 'react';

// VSCode webview API - use global variable set by the host HTML
const vscode = (window as any).vscode;

export default function SimpleApp() {
  const [message, setMessage] = useState('Initializing...');
  
  useEffect(() => {
    console.log('SimpleApp mounted');
    console.log('VSCode API available:', !!vscode);
    console.log('Ramen config:', window.ramenConfig);
    
    // Immediately set loaded state
    setMessage('Ramen Graph Editor - Simple Version Loaded!');
    
    // Test message handling
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from VSCode:', event.data);
      const message = event.data;
      
      switch (message.command || message.type) {
        case 'graphUpdate':
          setMessage('Graph updated successfully!');
          break;
        case 'error':
          setMessage(`Error: ${message.message}`);
          break;
        case 'updateTheme':
          document.body.dataset.theme = message.theme;
          setMessage(`Theme updated to: ${message.theme}`);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Send ready message to VSCode
    if (vscode) {
      setTimeout(() => {
        vscode.postMessage({
          type: 'webviewReady'
        });
        console.log('Sent webviewReady message to VSCode');
      }, 100);
    }
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleTestSave = () => {
    if (vscode) {
      vscode.postMessage({
        type: 'saveGraph',
        data: JSON.stringify({ test: 'data' }, null, 2)
      });
      setMessage('Save message sent to VSCode');
    } else {
      setMessage('VSCode API not available');
    }
  };

  const handleTestExecute = () => {
    if (vscode) {
      vscode.postMessage({
        type: 'executeGraph'
      });
      setMessage('Execute message sent to VSCode');
    } else {
      setMessage('VSCode API not available');
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
      color: 'var(--vscode-foreground, #cccccc)',
      padding: '20px'
    }}>
      <h1 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#007ACC' }}>
        🍜 Ramen Graph Editor
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Status:</strong> {message}</p>
        <p><strong>Graph Path:</strong> {window.ramenConfig?.graphPath || 'Unknown'}</p>
        <p><strong>Server Port:</strong> {window.ramenConfig?.serverPort || 'Unknown'}</p>
        <p><strong>Theme:</strong> {window.ramenConfig?.theme || 'Unknown'}</p>
        <p><strong>VSCode API:</strong> {vscode ? 'Available' : 'Not Available'}</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleTestSave}
          style={{
            backgroundColor: 'var(--vscode-button-background, #0e639c)',
            color: 'var(--vscode-button-foreground, #ffffff)',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '3px',
            cursor: 'pointer',
            marginRight: '10px',
            fontSize: '14px'
          }}
        >
          Test Save
        </button>
        
        <button 
          onClick={handleTestExecute}
          style={{
            backgroundColor: 'var(--vscode-button-background, #0e639c)',
            color: 'var(--vscode-button-foreground, #ffffff)',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Test Execute
        </button>
      </div>
      
      <div style={{ 
        flex: 1,
        backgroundColor: 'var(--vscode-panel-background, #252526)',
        border: '1px solid var(--vscode-panel-border, #464647)',
        borderRadius: '4px',
        padding: '16px',
        overflow: 'auto'
      }}>
        <h3 style={{ marginTop: 0 }}>Graph Data Preview:</h3>
        <pre style={{
          backgroundColor: 'var(--vscode-textCodeBlock-background, #2d2d30)',
          padding: '12px',
          borderRadius: '4px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: '12px',
          fontFamily: 'var(--vscode-editor-font-family, Consolas, Monaco, monospace)'
        }}>
          {window.ramenConfig?.graphData || 'No graph data available'}
        </pre>
      </div>
    </div>
  );
}