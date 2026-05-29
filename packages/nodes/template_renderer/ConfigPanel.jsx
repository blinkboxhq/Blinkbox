import { FileCode } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={FileCode} colorClass="text-amber-400" {...props} />;
