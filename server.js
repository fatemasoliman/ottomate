const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost'],
  credentials: true
}));

app.use(bodyParser.json());

let browser = null;
let page = null;
let cookies = null;

const COOKIES_FILE = 'cookies.json';

const wss = new WebSocket.Server({ port: 3002 });

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function initBrowser() {
  if (!browser) {
    log('Launching new browser instance');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    });
    log('Browser instance created');
  }
  if (!page) {
    log('Creating new page');
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    log('New page created');
  }
}

async function saveCookies() {
  cookies = await page.cookies();
  await fs.writeFile(COOKIES_FILE, JSON.stringify(cookies));
}

async function loadCookies() {
  try {
    const cookiesString = await fs.readFile(COOKIES_FILE, 'utf8');
    cookies = JSON.parse(cookiesString);
    return true;
  } catch (error) {
    return false;
  }
}

async function getLoginInputs() {
  return await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
      name: input.name,
      type: input.type,
      id: input.id,
      placeholder: input.placeholder
    }));
    const submitButton = document.querySelector('button[type="submit"]');
    return {
      inputs,
      submitButtonText: submitButton ? submitButton.innerText : null
    };
  });
}

async function submitLoginForm(formData) {
  await page.evaluate((data) => {
    Object.keys(data).forEach(key => {
      const input = document.querySelector(`input[name="${key}"]`);
      if (input) input.value = data[key];
    });
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) submitButton.click();
  }, formData);
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

app.post('/start-login', async (req, res) => {
  const { url } = req.body;
  try {
    log(`Initializing browser for URL: ${url}`);
    await initBrowser();
    log(`Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0' });
    log('Page loaded, getting login inputs');
    const loginInputs = await getLoginInputs();
    log(`Login inputs found: ${JSON.stringify(loginInputs)}`);
    res.json({ loginInputs });
  } catch (error) {
    log(`Error in /start-login: ${error.message}`);
    log(`Error stack: ${error.stack}`);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.post('/submit-login', async (req, res) => {
  const { formData, targetUrl } = req.body;
  try {
    await submitLoginForm(formData);
    const currentUrl = page.url();
    if (currentUrl === targetUrl) {
      await saveCookies();
      res.json({ success: true, message: 'Login successful' });
    } else {
      const loginInputs = await getLoginInputs();
      res.json({ success: false, loginInputs });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/automate', async (req, res) => {
  const { url, actions } = req.body;
  try {
    await initBrowser();
    await loadCookies();
    if (cookies) await page.setCookie(...cookies);
    await page.goto(url, { waitUntil: 'networkidle0' });

    for (const action of actions) {
      switch (action.type) {
        case 'click':
          await page.click(action.target);
          break;
        case 'input':
          await page.type(action.target, action.value);
          break;
        case 'select':
          await page.select(action.target, action.value);
          break;
      }
      await page.waitForTimeout(1000); // Wait for 1 second between actions
    }

    const screenshot = await page.screenshot({ encoding: 'base64' });
    res.json({ success: true, screenshot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  log(`Server running on port ${port}`);
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});
