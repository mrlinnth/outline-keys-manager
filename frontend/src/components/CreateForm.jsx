import { useState, useEffect } from 'react';

function CreateForm({ initialNames }) {
  const [serverJson, setServerJson] = useState('');
  const [namesText, setNamesText] = useState('');
  const [userEditedNames, setUserEditedNames] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!userEditedNames) {
      setNamesText(initialNames);
    }
  }, [initialNames]);

  const handleNamesChange = (e) => {
    setNamesText(e.target.value);
    setUserEditedNames(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);
    setFetchError(null);
    setResults(null);

    let parsed;
    try {
      parsed = JSON.parse(serverJson);
    } catch {
      setValidationError('Invalid JSON format');
      return;
    }

    if (!parsed.apiUrl) {
      setValidationError('JSON must contain "apiUrl" property');
      return;
    }

    if (!parsed.apiUrl.startsWith('https://')) {
      setValidationError('apiUrl must start with "https://"');
      return;
    }

    const names = namesText.split('\n').map(n => n.trim()).filter(Boolean);

    if (names.length === 0) {
      setValidationError('Enter at least one key name');
      return;
    }

    setLoading(true);

    try {
      const listResponse = await fetch('/api/keys/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: parsed.apiUrl })
      });

      const listData = await listResponse.json();

      if (!listResponse.ok) {
        setFetchError(listData.error || 'Failed to fetch existing keys');
        setLoading(false);
        return;
      }

      const existingKeys = new Set(listData.accessKeys.map(k => k.name));
      const newResults = [];

      for (const name of names) {
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
              apiUrl: parsed.apiUrl,
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
    } catch (err) {
      setFetchError(err.message);
    }

    setLoading(false);
  };

  const handleRetry = async () => {
    if (!results) return;

    const failedNames = results.filter(r => r.status === 'failed').map(f => f.name);
    if (failedNames.length === 0) return;

    setLoading(true);

    try {
      const parsed = JSON.parse(serverJson);
      
      const listResponse = await fetch('/api/keys/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: parsed.apiUrl })
      });

      const listData = await listResponse.json();

      if (!listResponse.ok) {
        setFetchError(listData.error || 'Failed to fetch existing keys');
        setLoading(false);
        return;
      }

      const existingKeys = new Set(listData.accessKeys.map(k => k.name));
      const retryResults = [];

      for (const name of failedNames) {
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
              apiUrl: parsed.apiUrl,
              name: finalName
            })
          });

          const createData = await createResponse.json();

          if (createResponse.ok) {
            retryResults.push({
              name,
              finalName,
              status: 'success',
              accessUrl: createData.accessUrl,
              error: null
            });
          } else {
            retryResults.push({
              name,
              finalName,
              status: 'failed',
              accessUrl: null,
              error: createData.error
            });
          }
        } catch (err) {
          retryResults.push({
            name,
            finalName,
            status: 'failed',
            accessUrl: null,
            error: err.message
          });
        }
      }

      const mergedResults = results.map(r => {
        if (r.status === 'success') return r;
        const retryResult = retryResults.find(n => n.name === r.name);
        return retryResult || r;
      });

      setResults(mergedResults);
    } catch (err) {
      setFetchError(err.message);
    }

    setLoading(false);
  };

  const handleStartOver = () => {
    setResults(null);
    setNamesText('');
    setUserEditedNames(false);
    setServerJson('');
  };

  const successes = results ? results.filter(r => r.status === 'success') : [];
  const failures = results ? results.filter(r => r.status === 'failed') : [];

  return (
    <div>
      <h2>Batch Create Keys</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Destination Server JSON
          <textarea
            placeholder='{"apiUrl":"https://...","certSha256":"..."}'
            value={serverJson}
            onChange={(e) => setServerJson(e.target.value)}
            disabled={loading}
            rows={5}
          />
        </label>

        <label>
          Key Names (one per line)
          <textarea
            placeholder="alice&#10;bob&#10;charlie"
            value={namesText}
            onChange={handleNamesChange}
            rows={8}
            disabled={loading}
          />
        </label>

        {validationError && <div className="error">{validationError}</div>}
        {fetchError && <div className="error">{fetchError}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Keys'}
        </button>
      </form>

      {results !== null && (
        <div>
          <p>{successes.length} created, {failures.length} failed</p>

          {successes.length > 0 && (
            <div>
              <pre>
                {successes.map(r => (
                  <div key={r.name}>
                    <strong>**{r.finalName}**</strong>
                    {r.finalName !== r.name && ` (created as: ${r.finalName})`}
                    {'\n'}
                    {r.accessUrl}
                    {'\n'}
                  </div>
                ))}
              </pre>
            </div>
          )}

          {failures.length > 0 && (
            <div>
              <h3>Failed Keys</h3>
              {failures.map((f, index) => (
                <div key={index} style={{ marginBottom: '10px' }}>
                  <strong>{f.name}</strong> — {f.error}
                </div>
              ))}
              <button onClick={handleRetry} disabled={loading}>
                {loading ? 'Retrying...' : 'Retry Failed'}
              </button>
            </div>
          )}

          <button onClick={handleStartOver} disabled={loading} style={{ marginTop: '20px' }}>
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

export default CreateForm;
