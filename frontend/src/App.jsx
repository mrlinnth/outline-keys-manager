import { useState } from 'react';
import CreateKeyPage from './components/CreateKeyPage';
import DeleteKeyPage from './components/DeleteKeyPage';
import MigrateKeysPage from './components/MigrateKeysPage';

function App() {
  // 'migrate' is default — it holds the pre-existing workflow
  const [activePage, setActivePage] = useState('migrate');

  return (
    <div className="container">
      <h1>Outline Key Manager</h1>

      <nav className="tab-bar">
        <button
          className={`tab ${activePage === 'create' ? 'active' : ''}`}
          onClick={() => setActivePage('create')}
        >
          Create Key
        </button>
        <button
          className={`tab ${activePage === 'delete' ? 'active' : ''}`}
          onClick={() => setActivePage('delete')}
        >
          Delete Key
        </button>
        <button
          className={`tab ${activePage === 'migrate' ? 'active' : ''}`}
          onClick={() => setActivePage('migrate')}
        >
          Migrate Keys
        </button>
      </nav>

      {activePage === 'create' && <CreateKeyPage />}
      {activePage === 'delete' && <DeleteKeyPage />}
      {activePage === 'migrate' && <MigrateKeysPage />}
    </div>
  );
}

export default App;
