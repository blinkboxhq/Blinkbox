import { Terminal } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';

export default (props) => <SchemaForm meta={meta} icon={Terminal} colorClass="text-white" {...props} />;
