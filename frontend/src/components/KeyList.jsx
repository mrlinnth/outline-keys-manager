function KeyList({ keyNames, onContinue }) {
  return (
    <div>
      <h2>Fetched Keys</h2>
      <p>Found {keyNames.length} key{keyNames.length !== 1 ? 's' : ''}</p>
      {keyNames.length > 0 && (
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto', 
          border: '1px solid #ddd', 
          borderRadius: '4px', 
          padding: '10px',
          marginBottom: '10px'
        }}>
          {keyNames.map((name, index) => (
            <div key={index} style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default KeyList;
