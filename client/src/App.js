import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [url, setUrl] = useState('https://ops.trella.app/loadboard/shp7ac748256d2b60a4');
  const [actions, setActions] = useState('[]');
  const [cookie, setCookie] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [screenshots, setScreenshots] = useState([]);

  const handleAutomate = async () => {
    try {
      console.log('Starting automation...');
      const parsedActions = JSON.parse(actions);
      const cookiesArray = cookie.split(';').map(c => {
        const [name, ...value] = c.trim().split('=');
        return { name, value: value.join('='), domain: new URL(url).hostname };
      });
      console.log('Sending request to:', `${API_URL}/automate`);
      const response = await axios.post(`${API_URL}/automate`, { url, actions: parsedActions, cookies: cookiesArray });
      console.log('Response received:', response.data);
      setResult(JSON.stringify(response.data, null, 2));
      setScreenshots(response.data.screenshots || []);
    } catch (error) {
      console.error('Error during automation:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      setError(`Error during automation: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>OttoMate</h1>
      </header>
      <main className="App-main">
        <div className="form-group">
          <label htmlFor="url">URL:</label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
            className="input-field"
          />
        </div>
        <div className="form-group">
          <label htmlFor="actions">Actions JSON:</label>
          <textarea
            id="actions"
            value={actions}
            onChange={(e) => setActions(e.target.value)}
            placeholder="Enter actions JSON"
            className="textarea-field"
          />
        </div>
        <div className="form-group">
          <label htmlFor="cookie">Authentication Cookie:</label>
          <textarea
            id="cookie"
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            placeholder="Enter authentication cookie (e.g., name1=value1; name2=value2)"
            className="textarea-field"
          />
          <small>Enter cookies in the format: name1=value1; name2=value2</small>
        </div>
        <button onClick={handleAutomate} className="button" style={{ backgroundColor: '#1B02B1' }}>Run Automation</button>

        {error && <div className="error-section">{error}</div>}
        {result && (
          <div className="result-section">
            <h2>Result:</h2>
            <pre>{result}</pre>
          </div>
        )}
        
        {screenshots.length > 0 && (
          <div className="screenshots-section">
            <h2>Screenshots:</h2>
            {screenshots.map((screenshot, index) => (
              <div key={index} className="screenshot-item">
                <h3>{screenshot.name}</h3>
                <img src={`data:image/png;base64,${screenshot.data}`} alt={screenshot.name} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
