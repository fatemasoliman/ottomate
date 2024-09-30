const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config();

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
  cookies = await page.cookies();
  await fs.writeFile(COOKIES_FILE, JSON.stringify(cookies));
}

async function loadCookies() {
  try {
    const cookiesString = await fs.readFile(COOKIES_FILE);
    cookies = JSON.parse(cookiesString);
    return true;
  } catch (error) {
    console.error('Error loading cookies:', error);
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
      if (cookiesLoaded) {
        await page.setCookie(...cookies);
      }
    }

    await page.goto(url, { waitUntil: 'networkidle0' });

    if (!skipLogin && !cookies) {
      await wait(30000); // Wait for 30 seconds for manual login
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

    if (cookies) {
      await page.setCookie(...cookies);
    }

    await page.goto(url, { waitUntil: 'networkidle0' });

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
        }, 500);
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
                  element.value = action.value;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
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
          } catch (error) {
            window.automationResults.push({ status: "error", error, action });
          }
        }
      })();

    }, JSON.stringify(actions), speed);

    // Wait for automation to complete
    await page.waitForFunction(() => window.automationResults && window.automationResults.length === JSON.parse(arguments[0]).length, {}, JSON.stringify(actions));

    // Get results
    const results = await page.evaluate(() => window.automationResults);

    const screenshot = await page.screenshot({ encoding: 'base64' });

    res.json({ 
      message: 'Automation completed',
      results,
      screenshot
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