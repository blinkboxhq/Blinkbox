import { ScanText } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={ScanText} colorClass="text-cyan-400" {...props} />;
