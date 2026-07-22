import { Cloud } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Cloud} colorClass="text-amber-400" logoUrl={logo} {...props} />;
