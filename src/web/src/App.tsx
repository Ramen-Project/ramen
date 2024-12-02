
import GraphEditor from './components/GraphEditor';
import './Global.css'

import { Theme, ThemePanel } from "@radix-ui/themes";

export default function App() {

  return (
    // TODO: Configurable theme
    <Theme accentColor='blue' appearance='dark' >
      <GraphEditor />
      <ThemePanel />
    </Theme>
    
  )
}
