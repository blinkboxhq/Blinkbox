import { Server } from 'lucide-react';
import meta from './meta.js';
import logo from '@triggers/ssh/logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Server} colorClass="text-white" logoUrl={logo} {...props} />;
