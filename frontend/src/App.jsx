import { useState } from 'react';
import CurrentServer from './components/CurrentServer';
import NewServer from './components/NewServer';

function App() {
  const [currentApiUrl, setCurrentApiUrl] = useState(null);
  const [currentKeys, setCurrentKeys] = useState([]);

  return (
    <div className="container">
      <h1>Outline Manager</h1>
      <CurrentServer
        onKeysLoaded={(apiUrl, keys) => {
          setCurrentApiUrl(apiUrl);
          setCurrentKeys(keys);
        }}
      />
      <hr />
      <NewServer sourceApiUrl={currentApiUrl} sourceKeys={currentKeys} />
    </div>
  );
}

export default App;
