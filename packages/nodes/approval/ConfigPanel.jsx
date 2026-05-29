import { CheckCircle2 } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={CheckCircle2} colorClass="text-yellow-400" {...props} />;
