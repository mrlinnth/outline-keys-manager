import { useState } from 'react';

function ServerForm({ title, onSubmit, loading }) {
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    
    try {
      const parsed = JSON.parse(value);
      
      if (!parsed.apiUrl) {
        setValidationError('JSON must contain "apiUrl" property');
        return;
      }
      
      if (!parsed.apiUrl.startsWith('https://')) {
        setValidationError('apiUrl must start with "https://"');
        return;
      }
      
      onSubmit({ apiUrl: parsed.apiUrl });
    } catch (err) {
      setValidationError('Invalid JSON format');
    }
  };

  return (
    <div>
      <h2>{title}</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Server JSON:
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='{"apiUrl":"https://...","certSha256":"..."}'
            rows="5"
            disabled={loading}
          />
        </label>
        {validationError && <div className="error">{validationError}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  );
}

export default ServerForm;
