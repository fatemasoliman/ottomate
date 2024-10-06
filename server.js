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
    const url = req.body.url;
    const actions = req.body.actions;
    const speed = req.body.speed || 1; // Default speed if not provided

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

    // Inject the updated automation script
    await page.evaluate((actionsString, speed) => {
      const actions = JSON.parse(actionsString);
      const baseWaitTime = 1000 / speed;

      let currentInputValues = {};

      function findElementFuzzy(selector) {
        console.log("Searching for element:", selector);
        try {
          // Try exact match first
          let element = document.querySelector(selector);
          if (element) {
            console.log("Exact match found:", element);
            return element;
          }
        } catch (error) {
          console.log("Invalid selector, trying fuzzy match:", selector);
        }

        // If not found or invalid selector, try fuzzy matching
        const allElements = document.querySelectorAll('*');
        let bestMatch = null;
        let highestScore = 0;

        allElements.forEach(el => {
          const score = calculateSimilarity(getElementIdentifiers(el), selector);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = el;
          }
        });

        if (bestMatch) {
          console.log(`Fuzzy match found for "${selector}":`, bestMatch, "with score:", highestScore);
        } else {
          console.log(`No match found for "${selector}"`);
        }

        return bestMatch;
      }

      function getElementIdentifiers(element) {
        return [
          element.id,
          element.name,
          element.className,
          element.tagName.toLowerCase(),
          element.getAttribute('data-testid'),
          ...Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`)
        ].filter(Boolean).join(' ');
      }

      function calculateSimilarity(str1, str2) {
        const set1 = new Set(str1.toLowerCase().split(/\W+/));
        const set2 = new Set(str2.toLowerCase().split(/\W+/));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size);
      }

      function highlightElement(element, color) {
        const originalOutline = element.style.outline;
        element.style.outline = `2px solid ${color}`;
        setTimeout(() => {
          element.style.outline = originalOutline;
        }, 2000);
      }

      function simulateMouseEvents(element, events) {
        events.forEach(eventType => {
          const rect = element.getBoundingClientRect();
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
          });
          element.dispatchEvent(event);
        });
      }

      function waitForOptions(optionValue, timeout = 5000) {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const checkOptions = () => {
            const options = document.querySelectorAll('[role="option"], .css-1n99x9s-placeholder');
            for (let option of options) {
              if (option.textContent.trim().toLowerCase().includes(optionValue.toLowerCase())) {
                resolve(option);
                return;
              }
            }
            if (Date.now() - startTime > timeout) {
              reject(new Error(`Option "${optionValue}" not found within ${timeout}ms`));
            } else {
              setTimeout(checkOptions, 100);
            }
          };
          checkOptions();
        });
      }

      async function performAction(action) {
        return new Promise(async (resolve) => {
          console.log("Attempting to perform action:", action);
          let element = findElementFuzzy(action.target);

          if (element) {
            console.log("Element found:", element);
            try {
              switch (action.type) {
                case 'click':
                  console.log("Performing click on:", element);
                  await clickElement(element);
                  break;
                case 'input':
                  console.log("Setting input value:", action.value);
                  await setReactInputValue(element, action.value);
                  break;
                case 'select':
                  console.log("Selecting option:", action.value);
                  await selectReactOption(element, action.value);
                  break;
                default:
                  console.error('Unknown action type:', action.type);
                  resolve({ status: "error", error: `Unknown action type: ${action.type}` });
                  return;
              }
              highlightElement(element, 'green');
              console.log(`Action completed: ${action.type} on ${action.target}`);
              await waitForActionCompletion(element, action);
              resolve({ status: "success" });
            } catch (error) {
              console.error(`Error performing ${action.type} action:`, error);
              highlightElement(element, 'red');
              resolve({ status: "error", error: error.message });
            }
          } else {
            console.error('Element not found:', action.target);
            resolve({ status: "error", error: `Element not found: ${action.target}` });
          }
        });
      }

      async function clickElement(element) {
        simulateMouseEvents(element, ['mouseover', 'mousedown', 'mouseup', 'click']);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      async function setReactInputValue(element, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(element, value);

        const ev2 = new Event('input', { bubbles: true });
        element.dispatchEvent(ev2);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      async function selectReactOption(element, value) {
        // Click to open the dropdown
        await clickElement(element);

        // Wait for the dropdown to open
        await new Promise(resolve => setTimeout(resolve, 500));

        // Find and click the option
        const options = document.querySelectorAll('[role="option"]');
        let optionFound = false;
        for (let option of options) {
          if (option.textContent.trim().toLowerCase().includes(value.toLowerCase())) {
            await clickElement(option);
            optionFound = true;
            break;
          }
        }

        if (!optionFound) {
          console.warn(`Option "${value}" not found in dropdown, but it might have been set correctly.`);
        }

        // Wait for the dropdown to close
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if the value was set correctly
        const selectedValue = element.textContent.trim() || element.value.trim();
        if (selectedValue.toLowerCase().includes(value.toLowerCase())) {
          console.log(`Option "${value}" successfully selected.`);
          return;
        }

        console.warn(`Unable to confirm if "${value}" was selected. Current value: "${selectedValue}"`);
      }

      async function waitForActionCompletion(element, action) {
        // Wait for any animations or React state updates to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // For input actions, wait for the value to be set
        if (action.type === 'input') {
          let attempts = 0;
          while (attempts < 10) {
            if (element.value === action.value) {
              console.log(`Input value confirmed: ${action.value}`);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          console.warn(`Input value not confirmed after ${attempts} attempts`);
        }

        // For select actions, wait for the dropdown to close
        if (action.type === 'select') {
          let attempts = 0;
          while (attempts < 10) {
            const dropdown = document.querySelector('[role="listbox"]');
            if (!dropdown || window.getComputedStyle(dropdown).display === 'none') {
              console.log('Dropdown closed after selection');
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          console.warn(`Dropdown did not close after ${attempts} attempts`);
        }
      }

      window.automationResults = [];

      (async () => {
        for (const action of actions) {
          try {
            const result = await performAction(action);
            window.automationResults.push(result);
            window.postMessage({ type: 'AUTOMATION_STEP', data: result }, '*');
            console.log(`Action completed with status: ${result.status} for ${action.type} on ${action.target}`);
          } catch (error) {
            console.error(`Unexpected error during action: ${action.type} on ${action.target}`, error);
          }
          // Add a delay between actions
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        window.postMessage({ type: 'AUTOMATION_COMPLETE' }, '*');
        console.log('Automation sequence completed');
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