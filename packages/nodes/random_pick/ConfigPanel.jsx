import { Shuffle } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Shuffle} colorClass="text-fuchsia-400" {...props} />;
