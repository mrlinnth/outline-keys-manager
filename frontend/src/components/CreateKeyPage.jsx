import { useState } from 'react';

function CreateKeyPage() {
  const [serverJson, setServerJson] = useState('');
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { name, accessUrl }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validate JSON (same pattern as ExportForm.jsx)
    let parsed;
    try {
      parsed = JSON.parse(serverJson);
    } catch {
      setError('Invalid JSON format');
      return;
    }
    if (!parsed.apiUrl || !parsed.apiUrl.startsWith('https://')) {
      setError('apiUrl must start with "https://"');
      return;
    }
    if (!keyName.trim()) {
      setError('Key name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: parsed.apiUrl, name: keyName.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setResult({ name: data.name, accessUrl: data.accessUrl });
      } else {
        setError(data.error || 'Failed to create key');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Create Key</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Server (paste JSON from Outline Manager)
          <textarea
            placeholder='{"apiUrl":"https://...","certSha256":"..."}'
            value={serverJson}
            onChange={(e) => setServerJson(e.target.value)}
            disabled={loading}
            rows={5}
          />
        </label>
        <label>
          Key Name
          <input
            type="text"
            placeholder="e.g. alice"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            disabled={loading}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Key'}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <p>Key "{result.name}" created successfully.</p>
          <span className="access-url">{result.accessUrl}</span>
        </div>
      )}
    </div>
  );
}

export default CreateKeyPage;
