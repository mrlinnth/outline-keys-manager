function Results({ results, onRetry, onStartOver, loading }) {
  const successes = results.filter(r => r.status === 'success');
  const failures = results.filter(r => r.status === 'failed');

  const handleRetry = () => {
    const failedNames = failures.map(f => f.name);
    onRetry(failedNames);
  };

  return (
    <div>
      <h2>Results</h2>
      <p>{successes.length} succeeded, {failures.length} failed</p>
      
      {successes.length > 0 && (
        <div>
          <h3>Successful Keys</h3>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {successes.map(r => (
              <div key={r.name}>
                <div>
                  <strong>**{r.finalName}**</strong>
                  {r.finalName !== r.name && ` (created as: ${r.finalName})`}
                </div>
                <div>{r.accessUrl}</div>
                <div>&nbsp;</div>
              </div>
            ))}
          </pre>
        </div>
      )}
      
      {failures.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Failed Keys</h3>
          {failures.map((f, index) => (
            <div key={index} style={{ 
              padding: '10px', 
              backgroundColor: '#fff3cd',
              borderRadius: '4px',
              marginBottom: '10px'
            }}>
              <div><strong>{f.name}</strong></div>
              <div className="error">{f.error}</div>
            </div>
          ))}
          <button onClick={handleRetry} disabled={loading}>
            {loading ? 'Retrying...' : 'Retry Failed Keys'}
          </button>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={onStartOver} disabled={loading}>
          Start Over
        </button>
      </div>
    </div>
  );
}

export default Results;
