import { Globe } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Globe} colorClass="text-[#00C7B7]" logoUrl={logo} {...props} />;
