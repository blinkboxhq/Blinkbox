import { Cpu } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';

export default (props) => <SchemaForm meta={meta} icon={Cpu} colorClass="text-white" {...props} />;
