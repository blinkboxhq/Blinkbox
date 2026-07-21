import { Regex } from 'lucide-react';
import meta from './meta.js';
import DbPanel from '@nodes/DbPanel.jsx';
import { OPERATIONS, DEFAULT_OPERATION } from './operations.js';

export { OPERATIONS };

export default function RegexMatchNode(props) {
  return (
    <DbPanel
      meta={meta}
      operations={OPERATIONS}
      defaultOperation={DEFAULT_OPERATION}
      icon={Regex}
      colorClass="text-green-400"
      {...props}
    />
  );
}
