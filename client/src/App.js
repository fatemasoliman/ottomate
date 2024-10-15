import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [url, setUrl] = useState('https://ops.trella.app/loadboard/shp7ac748256d2b60a4');
  const [actions, setActions] = useState('[]');
  const [loginInputs, setLoginInputs] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const handleStartLogin = async () => {
    try {
      console.log('Sending start login request');
      const response = await axios.post(`${API_URL}/start-login`, { url });
      console.log('Start login response:', response.data);
      setLoginInputs(response.data.loginInputs);
    } catch (error) {
      console.error('Error starting login:', error);
      setError(`Error starting login: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/submit-login`, { formData, targetUrl: url });
      if (response.data.success) {
        setIsLoggedIn(true);
        setLoginInputs(null);
      } else {
        setLoginInputs(response.data.loginInputs);
      }
    } catch (error) {
      setError(`Error submitting login: ${error.message}`);
    }
  };

  const handleAutomate = async () => {
    try {
      const parsedActions = JSON.parse(actions);
      const response = await axios.post(`${API_URL}/automate`, { url, actions: parsedActions });
      setResult(JSON.stringify(response.data, null, 2));
    } catch (error) {
      setError(`Error during automation: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <h1>OttoMate</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
      />
      <button onClick={handleStartLogin}>Start Login</button>

      {loginInputs && (
        <div>
          <h2>Login Form</h2>
          {loginInputs.inputs.map((input) => (
            <input
              key={input.name}
              type={input.type}
              name={input.name}
              placeholder={input.placeholder || input.name}
              onChange={handleInputChange}
            />
          ))}
          <button onClick={handleSubmitLogin}>
            {loginInputs.submitButtonText || 'Submit'}
          </button>
        </div>
      )}

      {isLoggedIn && (
        <div>
          <h2>Automation</h2>
          <textarea
            value={actions}
            onChange={(e) => setActions(e.target.value)}
            placeholder="Enter actions JSON"
          />
          <button onClick={handleAutomate}>Run Automation</button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {result && (
        <div className="result">
          <h2>Result:</h2>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
