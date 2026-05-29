import { HeartPulse } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={HeartPulse} colorClass="text-red-400" {...props} />;
