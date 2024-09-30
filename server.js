const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const WebSocket = require('ws');
require('dotenv').config();
const util = require('util');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(bodyParser.json());

let browser = null;
let page = null;
let cookies = null;

const COOKIES_FILE = 'cookies.json';

// Create WebSocket server
const wss = new WebSocket.Server({ port: 3002 });

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized']
    });
  }
  if (!page) {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
  }
}

async function saveCookies() {
  try {
    cookies = await page.cookies();
    await fs.writeFile(COOKIES_FILE, JSON.stringify(cookies));
    console.log('Cookies saved successfully');
  } catch (error) {
    console.error('Error saving cookies:', error);
  }
}

async function loadCookies() {
  try {
    const cookiesString = await fs.readFile(COOKIES_FILE, 'utf8');
    cookies = JSON.parse(cookiesString);
    console.log('Cookies loaded successfully');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No cookies file found. A new one will be created after login.');
    } else {
      console.error('Error loading cookies:', error);
    }
    return false;
  }
}

app.post('/manual-login', async (req, res) => {
  try {
    const { url, skipLogin } = req.body;
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    await initBrowser();

    if (!skipLogin) {
      const cookiesLoaded = await loadCookies();
      if (cookiesLoaded && cookies.length > 0) {
        console.log('Setting cookies for the page');
        await page.setCookie(...cookies);
      } else {
        console.log('No valid cookies found, proceeding with manual login');
      }
    }

    console.log('Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle0' });

    if (!skipLogin && (!cookies || cookies.length === 0)) {
      console.log('Waiting for manual login');
      await wait(30000); // Wait for 30 seconds for manual login
      console.log('Saving cookies after manual login');
      await saveCookies();
    }

    const screenshot = await page.screenshot({ encoding: 'base64' });
    res.json({ message: 'Page loaded successfully', screenshot });
  } catch (error) {
    console.error('Error during page load:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/automate', async (req, res) => {
  try {
    const { url, actions, speed } = req.body;

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!Array.isArray(actions)) {
      return res.status(400).json({ error: 'Actions must be an array' });
    }

    await initBrowser();

    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Navigate only if the current page is different from the requested URL
        if (page.url() !== url) {
          console.log('Navigating to new URL:', url);
          await page.goto(url, { waitUntil: 'load', timeout: 60000 });
          await wait(5000); // Wait for 5 seconds after load event
        } else {
          console.log('Already on the correct page:', url);
        }
        break;
      } catch (error) {
        console.error(`Navigation failed (attempt ${retries + 1}):`, error);
        retries++;
        if (retries === maxRetries) {
          return res.status(500).json({ error: 'Navigation failed after multiple attempts: ' + error.message });
        }
        await wait(5000); // Wait 5 seconds before retrying
      }
    }

    console.log('Navigation completed');
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());

    // Inject the automation script
    await page.evaluate((actionsString, speed) => {
      const actions = JSON.parse(actionsString);
      const baseWaitTime = 1000 / speed;

      function findElementFuzzy(selector) {
        try {
          return document.querySelector(selector);
        } catch (e) {
          console.log("Error with selector, trying alternatives");
          return Array.from(document.querySelectorAll('*')).find(el => 
            el.textContent.trim() === selector.trim()
          );
        }
      }

      function highlightElement(element, color) {
        const originalOutline = element.style.outline;
        element.style.outline = `2px solid ${color}`;
        setTimeout(() => {
          element.style.outline = originalOutline;
        }, 2000);
      }

      async function performAction(action) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const element = findElementFuzzy(action.target);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              switch (action.type) {
                case 'click':
                  highlightElement(element, 'red');
                  element.click();
                  break;
                case 'input':
                  highlightElement(element, 'blue');
                  // Try multiple methods to set the input value
                  element.value = action.value;
                  element.setAttribute('value', action.value);
                  // Use executeScript to set the value
                  const setValueScript = (el, value) => {
                    el.value = value;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  };
                  setValueScript(element, action.value);
                  // Simulate typing
                  action.value.split('').forEach(char => {
                    element.dispatchEvent(new KeyboardEvent('keydown', { key: char }));
                    element.dispatchEvent(new KeyboardEvent('keypress', { key: char }));
                    element.dispatchEvent(new KeyboardEvent('keyup', { key: char }));
                  });
                  break;
                default:
                  reject(`Unknown action type: ${action.type}`);
                  return;
              }
              resolve();
            } else {
              reject(`Element not found: ${action.target}`);
            }
          }, baseWaitTime);
        });
      }

      window.automationResults = [];

      (async () => {
        for (const action of actions) {
          try {
            await performAction(action);
            window.automationResults.push({ status: "success", action });
            window.postMessage({ type: 'AUTOMATION_STEP', data: { status: "success", action } }, '*');
          } catch (error) {
            window.automationResults.push({ status: "error", error, action });
            window.postMessage({ type: 'AUTOMATION_STEP', data: { status: "error", error, action } }, '*');
          }
        }
        window.postMessage({ type: 'AUTOMATION_COMPLETE' }, '*');
      })();
    }, JSON.stringify(actions), speed);

    console.log('Automation script injected');

    // Listen for messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });

    page.on('message', async (msg) => {
      if (msg.type() === 'AUTOMATION_STEP') {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg.data()));
          }
        });
      } else if (msg.type() === 'AUTOMATION_COMPLETE') {
        const results = await page.evaluate(() => window.automationResults);
        const screenshot = await page.screenshot({ encoding: 'base64' });
        res.json({ 
          message: 'Automation completed',
          results,
          screenshot
        });
      }
    });

  } catch (error) {
    console.error('Error during automation:', error);
    const screenshot = await page.screenshot({ encoding: 'base64' });
    res.status(500).json({ 
      error: error.message,
      screenshot
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit();
});

app.get('/cookie-status', (req, res) => {
  res.json({
    cookiesExist: !!cookies && cookies.length > 0,
    cookieCount: cookies ? cookies.length : 0
  });
});