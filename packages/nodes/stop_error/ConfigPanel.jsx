import { XCircle } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={XCircle} colorClass="text-red-400" {...props} />;
