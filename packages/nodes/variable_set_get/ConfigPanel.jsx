import { ToggleLeft } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={ToggleLeft} colorClass="text-cyan-400" {...props} />;
