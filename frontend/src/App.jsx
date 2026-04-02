import { useState } from 'react';
import ExportForm from './components/ExportForm';
import CreateForm from './components/CreateForm';

function App() {
  const [keyNames, setKeyNames] = useState([]);

  return (
    <div className="container">
      <h1>Outline Key Manager</h1>
      <ExportForm onNamesLoaded={setKeyNames} />
      <hr />
      <CreateForm initialNames={keyNames.join('\n')} />
    </div>
  );
}

export default App;
