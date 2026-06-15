import { useCallback, useState } from 'react';
import CurrentServer from './components/CurrentServer';
import NewServer from './components/NewServer';

function App() {
  const [currentApiUrl, setCurrentApiUrl] = useState(null);
  const [currentKeys, setCurrentKeys] = useState([]);
  const handleKeysLoaded = useCallback((apiUrl, keys) => {
    setCurrentApiUrl(apiUrl);
    setCurrentKeys(keys);
  }, []);

  return (
    <div className="container">
      <h1>Outline Manager</h1>
      <CurrentServer onKeysLoaded={handleKeysLoaded} />
      <hr />
      <NewServer sourceApiUrl={currentApiUrl} sourceKeys={currentKeys} />
    </div>
  );
}

export default App;
