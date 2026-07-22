import { Bug } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Bug} colorClass="text-[#FB4226]" logoUrl={logo} {...props} />;
