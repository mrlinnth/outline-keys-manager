import { useCallback, useEffect, useState } from 'react';
import KeyTable from './KeyTable';

function CurrentServer({ onKeysLoaded }) {
  const [jsonInput, setJsonInput] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [apiUrl, setApiUrl] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchKeys = useCallback(async () => {
    if (!apiUrl) {
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const requestBody = JSON.stringify({ apiUrl });
      const [listResponse, transferResponse] = await Promise.all([
        fetch('/api/keys/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        }),
        fetch('/api/keys/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        })
      ]);

      const listData = await listResponse.json();
      const transferData = await transferResponse.json();

      if (!listResponse.ok) {
        throw new Error(listData.error || 'Failed to load keys');
      }
      if (!transferResponse.ok) {
        throw new Error(transferData.error || 'Failed to load transfer metrics');
      }

      const bytesByUserId = transferData.bytesTransferredByUserId || {};
      const mergedKeys = (listData.accessKeys || []).map((key) => ({
        id: key.id,
        name: key.name,
        accessUrl: key.accessUrl,
        usageBytes: bytesByUserId[key.id] || 0
      }));

      setKeys(mergedKeys);
      onKeysLoaded(apiUrl, mergedKeys);
    } catch (error) {
      setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, onKeysLoaded]);

  useEffect(() => {
    if (!apiUrl) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      fetchKeys();
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [apiUrl, fetchKeys]);

  const handleJsonChange = (event) => {
    const value = event.target.value;
    setJsonInput(value);
    setFetchError(null);

    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      setValidationError('Invalid JSON');
      setApiUrl(null);
      return;
    }

    if (!parsed.apiUrl) {
      setValidationError('Missing apiUrl field');
      setApiUrl(null);
      return;
    }

    if (!parsed.apiUrl.startsWith('https://')) {
      setValidationError('apiUrl must start with https://');
      setApiUrl(null);
      return;
    }

    setValidationError(null);
    setApiUrl(parsed.apiUrl);
  };

  const handleCreateKey = async () => {
    if (!apiUrl || !newKeyName.trim()) {
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, name: newKeyName.trim() })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create key');
      }

      setNewKeyName('');
      await fetchKeys();
    } catch (error) {
      setCreateError(error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <section>
      <h2>Current Server</h2>
      <textarea
        placeholder='{"apiUrl":"https://...","certSha256":"..."}'
        value={jsonInput}
        onChange={handleJsonChange}
        rows={5}
      />
      {validationError && <p className="error">{validationError}</p>}
      {fetchError && <p className="error">{fetchError}</p>}
      {loading && <p>Loading keys...</p>}

      <div className="create-key-row">
        <input
          type="text"
          placeholder="Enter Key Name"
          value={newKeyName}
          onChange={(event) => setNewKeyName(event.target.value)}
        />
        <button
          type="button"
          onClick={handleCreateKey}
          disabled={!apiUrl || createLoading || !newKeyName.trim()}
        >
          {createLoading ? 'Creating...' : 'Create New Key'}
        </button>
      </div>
      {createError && <p className="error">{createError}</p>}

      <KeyTable keys={keys} apiUrl={apiUrl} onKeysChanged={fetchKeys} />
    </section>
  );
}

export default CurrentServer;
