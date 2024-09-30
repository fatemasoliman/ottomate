import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Make sure to create this CSS file

function App() {
  const [url, setUrl] = useState('https://ops.trella.app/loadboard/shp7ac748256d2b60a4');
  const [actions, setActions] = useState(JSON.stringify([
    {
      "target": "div#addComment > div:nth-of-type(2) > div > div:nth-of-type(2) > div",
      "type": "click"
    },
    {
      "target": "div#addComment > div:nth-of-type(2) > div > div:nth-of-type(2) > div",
      "type": "input",
      "value": "a"
    },
    {
      "target": "div#addComment > div:nth-of-type(2) > div > div:nth-of-type(2) > div",
      "type": "input",
      "value": "a"
    },
    {
      "target": "div#addComment > div:nth-of-type(2) > div:nth-of-type(2) > button > span",
      "type": "click"
    }
  ], null, 2));
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [skipLogin, setSkipLogin] = useState(false);
  const [automationSpeed, setAutomationSpeed] = useState(1);
  const serverPort = 3000;

  const handleManualLogin = async () => {
    try {
      const response = await axios.post(`http://localhost:${serverPort}/manual-login`, { url, skipLogin });
      console.log('Manual login response:', response.data);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error during manual login:', error);
      setError(`Manual login error: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult('');
    try {
      let parsedActions = JSON.parse(actions);
      console.log('Sending automation request with actions:', parsedActions);
      const response = await axios.post(`http://localhost:${serverPort}/automate`, {
        url,
        actions: parsedActions,
        speed: automationSpeed
      });
      console.log('Automation response:', response.data);
      setResult(JSON.stringify(response.data, null, 2));
      
      // Display screenshot if available
      if (response.data.screenshot) {
        const screenshotDiv = document.getElementById('screenshot');
        if (screenshotDiv) {
          const img = document.createElement('img');
          img.src = `data:image/png;base64,${response.data.screenshot}`;
          screenshotDiv.innerHTML = '';
          screenshotDiv.appendChild(img);
        } else {
          console.warn('Screenshot div not found');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = `Error: ${error.message}\n\n`;
      if (error.response) {
        errorMessage += `Status: ${error.response.status}\n`;
        // Omit the screenshot from the error data
        const errorData = { ...error.response.data };
        delete errorData.screenshot;
        errorMessage += `Data: ${JSON.stringify(errorData, null, 2)}\n\n`;
      }
      errorMessage += `Stack: ${error.stack}`;
      setError(errorMessage);
      
      // Display error screenshot if available
      if (error.response?.data?.screenshot) {
        const screenshotDiv = document.getElementById('screenshot');
        if (screenshotDiv) {
          const img = document.createElement('img');
          img.src = `data:image/png;base64,${error.response.data.screenshot}`;
          screenshotDiv.innerHTML = '';
          screenshotDiv.appendChild(img);
        } else {
          console.warn('Screenshot div not found');
        }
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setActions(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>OttoMate</h1>
        <p>Web Interaction Automation</p>
      </header>
      <main className="App-main">
        {!isLoggedIn ? (
          <div className="login-section">
            <h2>Login</h2>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter portal URL"
              className="input-field"
            />
            <div className="checkbox-container">
              <label>
                <input
                  type="checkbox"
                  checked={skipLogin}
                  onChange={(e) => setSkipLogin(e.target.checked)}
                />
                Skip login (for public websites)
              </label>
            </div>
            <button onClick={handleManualLogin} className="button">
              {skipLogin ? 'Load Public Page' : 'Start Manual Login'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="automation-form">
            <div className="form-group">
              <label htmlFor="url">URL:</label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label htmlFor="actions">Actions (JSON):</label>
              <textarea
                id="actions"
                value={actions}
                onChange={(e) => setActions(e.target.value)}
                required
                className="textarea-field"
              />
            </div>
            <div className="form-group">
              <label htmlFor="file-upload">Or upload JSON file:</label>
              <input
                type="file"
                id="file-upload"
                accept=".json"
                onChange={handleFileUpload}
                className="file-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="speed-slider">Automation Speed:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="speed-slider"
                  min="1"
                  max="4"
                  step="0.1"
                  value={automationSpeed}
                  onChange={(e) => setAutomationSpeed(parseFloat(e.target.value))}
                  className="slider"
                />
                <span className="slider-value">{automationSpeed.toFixed(1)}x</span>
              </div>
            </div>
            <button type="submit" className="button">Run Automation</button>
          </form>
        )}
        {error && (
          <div className="error-section">
            <h2>Error:</h2>
            <pre>{error}</pre>
          </div>
        )}
        {result && (
          <div className="result-section">
            <h2>Result:</h2>
            <pre>{result}</pre>
            <div id="screenshot" className="screenshot-container"></div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;