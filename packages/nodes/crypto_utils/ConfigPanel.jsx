import { Lock } from 'lucide-react';
import meta from './meta.js';
import DbPanel from '@nodes/DbPanel.jsx';
import { OPERATIONS, DEFAULT_OPERATION } from './operations.js';

export { OPERATIONS };

export default function CryptoUtilsNode(props) {
  return (
    <DbPanel
      meta={meta}
      operations={OPERATIONS}
      defaultOperation={DEFAULT_OPERATION}
      icon={Lock}
      colorClass="text-yellow-400"
      {...props}
    />
  );
}
