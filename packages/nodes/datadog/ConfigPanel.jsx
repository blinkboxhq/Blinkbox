import { Activity } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Activity} colorClass="text-[#632CA6]" logoUrl={logo} {...props} />;
