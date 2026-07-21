import { Zap } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import DbPanel from '@nodes/DbPanel.jsx';
import { OPERATIONS, DEFAULT_OPERATION } from './operations.js';

export { OPERATIONS };

export default function SupabaseNode(props) {
  return (
    <DbPanel
      meta={meta}
      operations={OPERATIONS}
      defaultOperation={DEFAULT_OPERATION}
      icon={Zap}
      colorClass="text-[#3ECF8E]"
      logoUrl={logo}
      {...props}
    />
  );
}
