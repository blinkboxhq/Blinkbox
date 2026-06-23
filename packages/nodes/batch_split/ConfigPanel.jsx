import { Layers } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Layers} colorClass="text-cyan-400" {...props} />;
