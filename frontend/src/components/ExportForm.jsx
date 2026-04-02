import { useState } from 'react';

function ExportForm({ onNamesLoaded }) {
  const [serverJson, setServerJson] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [namesText, setNamesText] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);
    setFetchError(null);

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

    setLoading(true);

    try {
      const response = await fetch('/api/keys/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: parsed.apiUrl })
      });

      const data = await response.json();

      if (response.ok) {
        const names = data.accessKeys.map(k => k.name);
        const joined = names.join('\n');
        setNamesText(joined);
        onNamesLoaded(names);
      } else {
        setFetchError(data.error || 'Failed to fetch keys');
      }
    } catch (err) {
      setFetchError(err.message);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Export Key Names</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Source Server JSON
          <textarea
            placeholder='{"apiUrl":"https://...","certSha256":"..."}'
            value={serverJson}
            onChange={(e) => setServerJson(e.target.value)}
            disabled={loading}
            rows={5}
          />
        </label>
        {validationError && <div className="error">{validationError}</div>}
        {fetchError && <div className="error">{fetchError}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Connecting...' : 'Get Names'}
        </button>
      </form>

      {namesText !== null && (
        <div>
          <p>Found {namesText.split('\n').filter(Boolean).length} keys. Copy below:</p>
          <textarea
            readOnly
            value={namesText}
            rows={8}
            onClick={(e) => e.target.select()}
          />
        </div>
      )}
    </div>
  );
}

export default ExportForm;
