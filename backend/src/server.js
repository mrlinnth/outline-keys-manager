import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: httpsAgent
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

app.post('/api/keys/list', async (req, res) => {
  try {
    const { apiUrl } = req.body;
    
    if (!apiUrl) {
      return res.status(500).json({ error: 'apiUrl is required' });
    }
    
    const url = `${apiUrl}/access-keys`;
    const data = await makeHttpsRequest(url, { method: 'GET' });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/keys/create', async (req, res) => {
  try {
    const { apiUrl, name } = req.body;
    
    if (!apiUrl) {
      return res.status(500).json({ error: 'apiUrl is required' });
    }
    
    if (!name) {
      return res.status(500).json({ error: 'name is required' });
    }
    
    const createUrl = `${apiUrl}/access-keys`;
    const keyData = await makeHttpsRequest(createUrl, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const keyId = keyData.id;
    
    const renameUrl = `${apiUrl}/access-keys/${keyId}/name`;
    try {
      await makeHttpsRequest(renameUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch (renameError) {
      return res.status(500).json({ 
        error: `Key created but rename failed: ${renameError.message}. Key ID: ${keyId}` 
      });
    }
    
    res.json({
      id: keyData.id,
      name: name,
      accessUrl: keyData.accessUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
