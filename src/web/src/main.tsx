import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import 'normalize.css/normalize.css'
import "@radix-ui/themes/styles.css"; 
import './Global.css'

import { Theme, ThemePanel } from "@radix-ui/themes";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme>
      <App />
      <ThemePanel />
    </Theme>
  </React.StrictMode>
)
