import React from 'react'
import ReactDOM from 'react-dom/client'
// import SimpleApp from './SimpleApp.tsx'
import App from './App.tsx'

import 'normalize.css/normalize.css'
import "@radix-ui/themes/styles.css"
import './Global.css'

// VS Code webview specific setup
declare global {
  interface Window {
    acquireVsCodeApi: () => any;
    vscode?: any;
    ramenConfig?: {
      graphPath: string;
      serverPort: number;
      theme: string;
      graphData: string;
      isVSCode: boolean;
      isCustomEditor: boolean;
    };
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)