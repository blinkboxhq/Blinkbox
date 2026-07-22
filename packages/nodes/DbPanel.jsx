import { useEffect } from 'react';
import SchemaForm from '@nodes/SchemaForm.jsx';

// The action picker stores a display label in `selectedAction`; backends dispatch
// on the `operation` slug. Resolve label → slug and keep `operation` in sync.
export default function DbPanel({
  meta, operations, defaultOperation, icon, colorClass, logoUrl, imgFilter,
  config = {}, updateConfig, nodeId, hideHeader, hideAction,
}) {
  const fromLabel = operations.find((o) => o.label === config.selectedAction)?.value;
  const fromConfig = operations.some((o) => o.value === config.operation) ? config.operation : null;
  const op = fromLabel || fromConfig || defaultOperation;

  useEffect(() => {
    if (op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);

  return (
    <SchemaForm
      meta={meta}
      icon={icon}
      colorClass={colorClass}
      logoUrl={logoUrl}
      imgFilter={imgFilter}
      config={{ ...config, operation: op }}
      updateConfig={updateConfig}
      nodeId={nodeId}
      hideHeader={hideHeader}
      hideAction={hideAction}
    />
  );
}
