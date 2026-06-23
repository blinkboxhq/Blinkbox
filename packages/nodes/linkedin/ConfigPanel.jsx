import { Briefcase } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Briefcase} colorClass="text-blue-400" {...props} />;
