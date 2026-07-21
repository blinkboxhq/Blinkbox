import { Database } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import DbPanel from '@nodes/DbPanel.jsx';
import { OPERATIONS, DEFAULT_OPERATION } from './operations.js';

export { OPERATIONS };

export default function RedisNode(props) {
  return (
    <DbPanel
      meta={meta}
      operations={OPERATIONS}
      defaultOperation={DEFAULT_OPERATION}
      icon={Database}
      colorClass="text-[#DC382D]"
      logoUrl={logo}
      {...props}
    />
  );
}
