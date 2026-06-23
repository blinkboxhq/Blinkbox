import { BookOpen } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={BookOpen} colorClass="text-indigo-400" {...props} />;
