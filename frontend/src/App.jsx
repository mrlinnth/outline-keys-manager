import { useState } from 'react';
import ServerForm from './components/ServerForm';
import KeyList from './components/KeyList';
import Results from './components/Results';

function App() {
  const [sourceServer, setSourceServer] = useState(null);
  const [destinationServer, setDestinationServer] = useState(null);
  const [keyNames, setKeyNames] = useState([]);
  const [results, setResults] = useState([]);
  const [step, setStep] = useState('source');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSourceSubmit = async (serverDetails) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/keys/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverDetails)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const keys = data.accessKeys.map(k => k.name);
        setKeyNames(keys);
        setSourceServer(serverDetails);
        setStep('destination');
      } else {
        setError(data.error || 'Failed to fetch keys');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  const handleDestinationSubmit = async (serverDetails) => {
    setLoading(true);
    setError(null);
    setDestinationServer(serverDetails);
    
    await createKeys(serverDetails, keyNames);
  };

  const createKeys = async (serverDetails, namesToCreate) => {
    try {
      const listResponse = await fetch('/api/keys/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverDetails)
      });
      
      const listData = await listResponse.json();
      
      if (!listResponse.ok) {
        setError(listData.error || 'Failed to fetch existing keys');
        setLoading(false);
        return;
      }
      
      const existingKeys = new Set(listData.accessKeys.map(k => k.name));
      const newResults = [];
      
      for (const name of namesToCreate) {
        let finalName = name;
        let suffix = 2;
        
        while (existingKeys.has(finalName)) {
          finalName = `${name}_${suffix}`;
          suffix++;
        }
        
        existingKeys.add(finalName);
        
        try {
          const createResponse = await fetch('/api/keys/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              apiUrl: serverDetails.apiUrl, 
              name: finalName 
            })
          });
          
          const createData = await createResponse.json();
          
          if (createResponse.ok) {
            newResults.push({
              name,
              finalName,
              status: 'success',
              accessUrl: createData.accessUrl,
              error: null
            });
          } else {
            newResults.push({
              name,
              finalName,
              status: 'failed',
              accessUrl: null,
              error: createData.error
            });
          }
        } catch (err) {
          newResults.push({
            name,
            finalName,
            status: 'failed',
            accessUrl: null,
            error: err.message
          });
        }
      }
      
      setResults(newResults);
      setStep('results');
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  const handleRetry = async (failedNames) => {
    setLoading(true);
    setError(null);
    
    const oldResults = [...results];
    const failedKeys = oldResults.filter(r => r.status === 'failed');
    const namesToRetry = failedKeys.map(f => failedNames.includes(f.name) ? f.name : null).filter(Boolean);
    
    try {
      const listResponse = await fetch('/api/keys/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(destinationServer)
      });
      
      const listData = await listResponse.json();
      
      if (!listResponse.ok) {
        setError(listData.error || 'Failed to fetch existing keys');
        setLoading(false);
        return;
      }
      
      const existingKeys = new Set(listData.accessKeys.map(k => k.name));
      const newResults = [];
      
      for (const name of namesToRetry) {
        let finalName = name;
        let suffix = 2;
        
        while (existingKeys.has(finalName)) {
          finalName = `${name}_${suffix}`;
          suffix++;
        }
        
        existingKeys.add(finalName);
        
        try {
          const createResponse = await fetch('/api/keys/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              apiUrl: destinationServer.apiUrl, 
              name: finalName 
            })
          });
          
          const createData = await createResponse.json();
          
          if (createResponse.ok) {
            newResults.push({
              name,
              finalName,
              status: 'success',
              accessUrl: createData.accessUrl,
              error: null
            });
          } else {
            newResults.push({
              name,
              finalName,
              status: 'failed',
              accessUrl: null,
              error: createData.error
            });
          }
        } catch (err) {
          newResults.push({
            name,
            finalName,
            status: 'failed',
            accessUrl: null,
            error: err.message
          });
        }
      }
      
      const mergedResults = oldResults.map(r => {
        if (r.status === 'success') return r;
        const retryResult = newResults.find(n => n.name === r.name);
        return retryResult || r;
      });
      
      setResults(mergedResults);
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  const handleStartOver = () => {
    setSourceServer(null);
    setDestinationServer(null);
    setKeyNames([]);
    setResults([]);
    setStep('source');
    setLoading(false);
    setError(null);
  };

  return (
    <div className={loading ? 'container loading' : 'container'}>
      <h1>Outline Key Manager</h1>
      
      {error && <div className="error">{error}</div>}
      
      {step === 'source' && (
        <ServerForm 
          title="Source Server" 
          onSubmit={handleSourceSubmit} 
          loading={loading}
        />
      )}
      
      {step === 'destination' && (
        <>
          <KeyList keyNames={keyNames} onContinue={() => {}} />
          <ServerForm 
            title="Destination Server" 
            onSubmit={handleDestinationSubmit} 
            loading={loading}
          />
        </>
      )}
      
      {step === 'results' && (
        <Results 
          results={results}
          onRetry={handleRetry}
          onStartOver={handleStartOver}
          loading={loading}
        />
      )}
    </div>
  );
}

export default App;
