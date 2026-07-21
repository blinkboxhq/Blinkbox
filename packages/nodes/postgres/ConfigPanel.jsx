import { Database } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import DbPanel from '@nodes/DbPanel.jsx';
import { OPERATIONS, DEFAULT_OPERATION } from './operations.js';

export { OPERATIONS };

export default function PostgresNode(props) {
  return (
    <DbPanel
      meta={meta}
      operations={OPERATIONS}
      defaultOperation={DEFAULT_OPERATION}
      icon={Database}
      colorClass="text-[#5B9BD5]"
      logoUrl={logo}
      {...props}
    />
  );
}
