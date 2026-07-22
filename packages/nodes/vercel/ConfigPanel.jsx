import { Triangle } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Triangle} colorClass="text-white" logoUrl={logo} {...props} />;
