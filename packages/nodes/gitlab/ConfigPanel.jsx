import { GitBranch } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';

export const OPERATIONS = meta.fields.find((f) => f.name === 'operation').options;

export default (props) => <SchemaForm meta={meta} icon={GitBranch} colorClass="text-orange-400" logoUrl={logo} {...props} />;
