import { FolderOpen } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';

export default (props) => <SchemaForm meta={meta} icon={FolderOpen} colorClass="text-white" {...props} />;
