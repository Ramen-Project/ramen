
import GraphEditor from './components/GraphEditor';
import './Global.css'

import { Theme } from "@radix-ui/themes";

export default function App() {
  return (
    // TODO: Configurable theme
    <Theme accentColor='blue' appearance='dark' grayColor='mauve'>
      <GraphEditor />
    </Theme>
  )
}
