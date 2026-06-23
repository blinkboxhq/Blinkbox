import { ShieldAlert } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={ShieldAlert} colorClass="text-blue-400" {...props} />;
