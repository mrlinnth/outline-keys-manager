import { useEffect, useState } from 'react';

function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function KeyTable({ keys, apiUrl, onKeysChanged, disabled = false }) {
  const [busyKeyId, setBusyKeyId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    if (!copyFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyFeedback(null);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback]);

  const handleCopy = async (key) => {
    setActionError(null);

    try {
      await navigator.clipboard.writeText(key.accessUrl);
      setCopyFeedback(key.id);
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleRemove = async (key) => {
    const confirmed = window.confirm(`Remove key "${key.name}"?`);
    if (!confirmed) {
      return;
    }

    setBusyKeyId(key.id);
    setActionError(null);

    try {
      const response = await fetch('/api/keys/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, name: key.name })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove key');
      }

      await onKeysChanged();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyKeyId(null);
    }
  };

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Key Name</th>
            <th>Usage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id}>
              <td>{key.name}</td>
              <td>{formatBytes(key.usageBytes)}</td>
              <td>
                <button
                  type="button"
                  className={`btn-action btn-copy ${copyFeedback === key.id ? 'copied' : ''}`}
                  onClick={() => handleCopy(key)}
                  disabled={!apiUrl || disabled || busyKeyId === key.id}
                >
                  {copyFeedback === key.id ? 'Copied!' : 'Copy Access Key'}
                </button>
                <button
                  type="button"
                  className="btn-action btn-remove"
                  onClick={() => handleRemove(key)}
                  disabled={!apiUrl || disabled || busyKeyId === key.id}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {actionError && <p className="error">{actionError}</p>}
    </>
  );
}

export default KeyTable;
