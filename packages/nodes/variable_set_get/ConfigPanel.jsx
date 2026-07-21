import { ToggleLeft } from 'lucide-react';
import meta from './meta.js';
import DbPanel from '@nodes/DbPanel.jsx';
import { OPERATIONS, DEFAULT_OPERATION } from './operations.js';

export { OPERATIONS };

export default function VariableSetGetNode(props) {
  return (
    <DbPanel
      meta={meta}
      operations={OPERATIONS}
      defaultOperation={DEFAULT_OPERATION}
      icon={ToggleLeft}
      colorClass="text-cyan-400"
      {...props}
    />
  );
}
