import { UploadCloud } from 'lucide-react';
import meta from './meta.js';
import SchemaForm from '@nodes/SchemaForm.jsx';

export default (props) => <SchemaForm meta={meta} icon={UploadCloud} colorClass="text-sky-400" {...props} />;
