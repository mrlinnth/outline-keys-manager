function formatSuccess(result) {
  const label = result.finalName === result.name
    ? `**${result.name}**`
    : `**${result.name}** (created as: ${result.finalName})`;

  return `${label}\n${result.accessUrl}`;
}

function MigrateResults({ results, onStartOver, onRetry, loading }) {
  const successes = results.filter((result) => result.status === 'success');
  const failures = results.filter((result) => result.status === 'failed');
  const failedNames = failures.map((failure) => failure.name);

  return (
    <div className="result-box">
      <h3>Results</h3>
      <p>{successes.length} succeeded, {failures.length} failed</p>

      {successes.length > 0 && (
        <div>
          <h3>Successful Keys</h3>
          <pre>{successes.map(formatSuccess).join('\n\n')}</pre>
        </div>
      )}

      {failures.length > 0 && (
        <div>
          <h3>Failed Keys</h3>
          {failures.map((failure) => (
            <div className="failure-item" key={`${failure.name}-${failure.finalName}`}>
              <strong>{failure.name}</strong>
              <p className="error">{failure.error}</p>
            </div>
          ))}
          <button type="button" onClick={() => onRetry(failedNames)} disabled={loading}>
            {loading ? 'Retrying...' : 'Retry Failed Keys'}
          </button>
        </div>
      )}

      <button type="button" onClick={onStartOver} disabled={loading}>
        Start Over
      </button>
    </div>
  );
}

export default MigrateResults;
