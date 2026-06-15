import { useState } from 'react';
import MigrateResults from './MigrateResults';

function getAvailableName(name, existingNames) {
  if (!existingNames.has(name)) {
    return name;
  }

  let suffix = 2;
  let candidate = `${name}_${suffix}`;
  while (existingNames.has(candidate)) {
    suffix += 1;
    candidate = `${name}_${suffix}`;
  }
  return candidate;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function NewServer({ sourceApiUrl, sourceKeys }) {
  const [jsonInput, setJsonInput] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [destApiUrl, setDestApiUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [migrationError, setMigrationError] = useState(null);

  const handleJsonChange = (event) => {
    const value = event.target.value;
    setJsonInput(value);
    setMigrationError(null);

    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      setValidationError('Invalid JSON');
      setDestApiUrl(null);
      return;
    }

    if (!parsed.apiUrl) {
      setValidationError('Missing apiUrl field');
      setDestApiUrl(null);
      return;
    }

    if (!parsed.apiUrl.startsWith('https://')) {
      setValidationError('apiUrl must start with https://');
      setDestApiUrl(null);
      return;
    }

    setValidationError(null);
    setDestApiUrl(parsed.apiUrl);
  };

  const loadDestinationNames = async () => {
    const listData = await postJson('/api/keys/list', { apiUrl: destApiUrl });
    return new Set((listData.accessKeys || []).map((key) => key.name));
  };

  const createKeys = async (keyNames, existingNames) => {
    const createdResults = [];

    for (const name of keyNames) {
      const finalName = getAvailableName(name, existingNames);
      existingNames.add(finalName);

      try {
        const data = await postJson('/api/keys/create', {
          apiUrl: destApiUrl,
          name: finalName
        });

        createdResults.push({
          name,
          finalName,
          status: 'success',
          accessUrl: data.accessUrl,
          error: null
        });
      } catch (error) {
        createdResults.push({
          name,
          finalName,
          status: 'failed',
          accessUrl: null,
          error: error.message
        });
      }
    }

    return createdResults;
  };

  const handleMigrate = async () => {
    if (!destApiUrl || sourceKeys.length === 0) {
      return;
    }

    setLoading(true);
    setResults(null);
    setMigrationError(null);

    try {
      const existingNames = await loadDestinationNames();
      const migratedResults = await createKeys(
        sourceKeys.map((key) => key.name),
        existingNames
      );
      setResults(migratedResults);
    } catch (error) {
      setMigrationError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (failedNames) => {
    if (!destApiUrl || failedNames.length === 0) {
      return;
    }

    setLoading(true);
    setMigrationError(null);

    try {
      const existingNames = await loadDestinationNames();
      const retryResults = await createKeys(failedNames, existingNames);
      setResults((previousResults) => {
        const pendingRetryResults = [...retryResults];
        const successes = (previousResults || []).filter((result) => result.status === 'success');
        const replacedFailures = (previousResults || [])
          .filter((result) => result.status === 'failed')
          .map((result) => pendingRetryResults.shift() || result);

        return [...successes, ...replacedFailures];
      });
    } catch (error) {
      setMigrationError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setResults(null);
    setJsonInput('');
    setDestApiUrl(null);
    setValidationError(null);
    setMigrationError(null);
  };

  return (
    <section>
      <h2>New Server</h2>
      <textarea
        placeholder='{"apiUrl":"https://...","certSha256":"..."}'
        value={jsonInput}
        onChange={handleJsonChange}
        rows={5}
      />
      {validationError && <p className="error">{validationError}</p>}
      {migrationError && <p className="error">{migrationError}</p>}

      {!results && (
        <button
          type="button"
          onClick={handleMigrate}
          disabled={!destApiUrl || sourceKeys.length === 0 || loading}
        >
          {loading ? 'Migrating...' : 'Migrate All Keys'}
        </button>
      )}

      {results && (
        <MigrateResults
          results={results}
          onStartOver={handleStartOver}
          onRetry={handleRetry}
          loading={loading}
        />
      )}
    </section>
  );
}

export default NewServer;
