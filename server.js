const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const WebSocket = require('ws');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost';

app.use(cors({
  origin: ['http://3.29.35.64', 'http://localhost:3001'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static('screenshots'));

// Add this near the top of your file, after the other app.use() statements
app.get('/', (req, res) => {
  res.send('OttoMate server is running');
});

let browser = null;
let page = null;

const wss = new WebSocket.Server({ port: 3002 });

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function takeScreenshot(name) {
  if (page) {
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    log(`Screenshot taken: ${name}`);
    return { name, data: screenshot };
  }
}

async function initBrowser() {
  if (!browser) {
    log('Launching new browser instance');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
      // Remove the executablePath option
    });
    log('Browser instance created');
  }
  if (!page) {
    log('Creating new page');
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    log('New page created');
    await takeScreenshot('after_page_creation');

    // Add more detailed logging
    page.on('console', msg => log(`Browser console: ${msg.text()}`));
    page.on('pageerror', error => log(`Browser page error: ${error.message}`));
    page.on('request', request => log(`Browser request: ${request.method()} ${request.url()}`));
    page.on('response', response => log(`Browser response: ${response.status()} ${response.url()}`));
  }
}

app.post('/automate', async (req, res) => {
  const { url, actions, cookies } = req.body;
  try {
    await initBrowser();
    const screenshots = [];
    
    screenshots.push(await takeScreenshot('before_setting_cookies'));
    
    if (cookies && Array.isArray(cookies)) {
      for (const cookie of cookies) {
        try {
          await page.setCookie(cookie);
          log(`Cookie set successfully: ${cookie.name}`);
        } catch (cookieError) {
          log(`Error setting cookie ${cookie.name}: ${cookieError.message}`);
        }
      }
    } else {
      log('No valid cookies provided');
    }
    
    screenshots.push(await takeScreenshot('after_setting_cookies'));
    
    log(`Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0' });
    log('Page loaded');
    screenshots.push(await takeScreenshot('after_page_load'));

    for (const action of actions) {
      log(`Performing action: ${JSON.stringify(action)}`);
      switch (action.type) {
        case 'click':
          log(`Clicking on: ${action.target}`);
          await page.click(action.target);
          log('Click performed');
          break;
        case 'input':
          log(`Typing into: ${action.target}`);
          await page.type(action.target, action.value);
          log('Input performed');
          break;
        case 'select':
          log(`Selecting option in: ${action.target}`);
          await page.select(action.target, action.value);
          log('Selection performed');
          break;
      }
      log('Waiting for 1 second');
      await page.waitForTimeout(1000);
      screenshots.push(await takeScreenshot(`after_action_${action.type}`));
    }

    log('Taking final screenshot');
    screenshots.push(await takeScreenshot('final'));
    log('Final screenshot taken');
    
    res.json({ 
      success: true, 
      screenshots,
      message: 'Automation completed.'
    });
  } catch (error) {
    log(`Error in /automate: ${error.message}`);
    log(`Error stack: ${error.stack}`);
    const errorScreenshot = await takeScreenshot('error');
    res.status(500).json({ 
      error: error.message, 
      stack: error.stack,
      errorScreenshot
    });
  }
});

app.listen(port, () => {
  log(`Server running on port ${port}`);
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});
