import { Box } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import DbPanel from '@nodes/DbPanel.jsx';
import { OPERATIONS, DEFAULT_OPERATION } from './operations.js';

export { OPERATIONS };

export default function PineconeNode(props) {
  return (
    <DbPanel
      meta={meta}
      operations={OPERATIONS}
      defaultOperation={DEFAULT_OPERATION}
      icon={Box}
      colorClass="text-green-400"
      logoUrl={logo}
      {...props}
    />
  );
}
