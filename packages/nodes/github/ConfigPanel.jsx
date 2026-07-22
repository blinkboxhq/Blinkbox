import { Github } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Github} colorClass="text-zinc-200" logoUrl={logo} {...props} />;
