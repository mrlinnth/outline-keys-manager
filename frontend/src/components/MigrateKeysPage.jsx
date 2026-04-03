import { useState } from 'react';
import ExportForm from './ExportForm';
import CreateForm from './CreateForm';

function MigrateKeysPage() {
  const [keyNames, setKeyNames] = useState([]);

  return (
    <div>
      <ExportForm onNamesLoaded={setKeyNames} />
      <hr />
      <CreateForm initialNames={keyNames.join('\n')} />
    </div>
  );
}

export default MigrateKeysPage;
