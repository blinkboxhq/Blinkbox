import { Siren } from 'lucide-react';
import meta from './meta.js';
import logo from './logo.svg';
import SchemaForm from '@nodes/SchemaForm.jsx';
export default (props) => <SchemaForm meta={meta} icon={Siren} colorClass="text-[#06AC38]" logoUrl={logo} {...props} />;
