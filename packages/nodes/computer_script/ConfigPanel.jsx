import { FileCode2 } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';

export default (props) => <SchemaForm meta={meta} icon={FileCode2} colorClass="text-white" {...props} />;
