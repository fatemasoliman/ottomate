import React, { useState, useEffect } from 'react';

const defaultUrl = 'https://ops.trella.app/upsert/jobs/domestic/new';
const defaultActions = [
    {
      "target": "div#shipperKey > div > div > div:nth-of-type(2)",
      "type": "click"
    },
    {
      "target": "input#shipperKey",
      "type": "input",
      "value": "d"
    },
    {
      "target": "input#shipperKey",
      "type": "input",
      "value": "de"
    },
    {
      "target": "input#shipperKey",
      "type": "input",
      "value": "dem"
    },
    {
      "target": "input#shipperKey",
      "type": "input",
      "value": "demo"
    },
    {
      "target": "div#shipperKey-ent7930409194f58afd",
      "type": "select",
      "value": "Demo Shipper - 44"
    },
    {
      "target": "input#shipperKey",
      "type": "input",
      "value": ""
    },
    {
      "target": "div#pickupAddress > div > div > div:nth-of-type(2)",
      "type": "click"
    },
    {
      "target": "div#pickupAddress-addf87f97dbed2ef920 > div > label",
      "type": "select",
      "value": "الشركة الفرنسيةAl Gharbiyah - Tanta"
    },
    {
      "target": "input#pickupAddress",
      "type": "input",
      "value": ""
    },
    {
      "target": "input#react-aria3741151957-:r2b:",
      "type": "input",
      "value": ""
    },
    {
      "target": "div#id-Time-11:00",
      "type": "click"
    },
    {
      "target": "input#react-aria3741151957-:r2b:",
      "type": "input",
      "value": ""
    },
    {
      "target": "div#dropOffAddress > div > div > div:nth-of-type(2)",
      "type": "click"
    },
    {
      "target": "div#dropOffAddress-addb032679841c1dea7 > div > label",
      "type": "select",
      "value": "#testCodesheben komAl Gharbiyah - Basioun"
    },
    {
      "target": "input#dropOffAddress",
      "type": "input",
      "value": ""
    },
    {
      "target": "input#react-aria3741151957-:r32:",
      "type": "input",
      "value": ""
    },
    {
      "target": "div#id-Time-21:00",
      "type": "click"
    },
    {
      "target": "input#react-aria3741151957-:r32:",
      "type": "input",
      "value": ""
    },
    {
      "target": "div#vehicleType > div > div",
      "type": "click"
    },
    {
      "target": "div#vehicleType-vt15505f6558934f93af03ac36848d238e",
      "type": "select",
      "value": "Closed Pick-Up"
    },
    {
      "target": "input#vehicleType",
      "type": "input",
      "value": ""
    },
    {
      "target": "div#commodity > div > div > div:nth-of-type(2)",
      "type": "click"
    },
    {
      "target": "div#commodity-cmeb8b5758baaf39b1",
      "type": "select",
      "value": "Iron Rolls"
    },
    {
      "target": "input#commodity",
      "type": "input",
      "value": ""
    },
    {
      "target": "input#weight",
      "type": "click"
    },
    {
      "target": "input#weight",
      "type": "input",
      "value": "1"
    },
    {
      "target": "input#weight",
      "type": "input",
      "value": "11"
    },
    {
      "target": "input#weight",
      "type": "input",
      "value": "11"
    },
    {
      "target": "input#bookingNumber",
      "type": "click"
    },
    {
      "target": "input#bookingNumber",
      "type": "input",
      "value": "1"
    },
    {
      "target": "input#bookingNumber",
      "type": "input",
      "value": "12"
    },
    {
      "target": "input#bookingNumber",
      "type": "input",
      "value": "123"
    },
    {
      "target": "input#bookingNumber",
      "type": "input",
      "value": "1234"
    },
    {
      "target": "input#bookingNumber",
      "type": "input",
      "value": "12345"
    },
    {
      "target": "input#bookingNumber",
      "type": "input",
      "value": "123456"
    },
    {
      "target": "input#bookingNumber",
      "type": "input",
      "value": "123456"
    },
    {
      "target": "textarea#notes",
      "type": "click"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "h"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "he"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "hel"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "hell"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "helll"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "hell"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "hello"
    },
    {
      "target": "textarea#notes",
      "type": "input",
      "value": "hello"
    },
    {
      "target": "button#submit-btn > svg",
      "type": "click"
    }
  ];

function AutomationPage() {
  const [url, setUrl] = useState(defaultUrl);
  const [actions, setActions] = useState(defaultActions);

  // ... rest of your component code

  return (
    <div>
      <input 
        type="text" 
        value={url} 
        onChange={(e) => setUrl(e.target.value)} 
        placeholder="Enter URL"
      />
      <textarea 
        value={JSON.stringify(actions, null, 2)} 
        onChange={(e) => setActions(JSON.parse(e.target.value))} 
        placeholder="Enter actions JSON"
      />
      {/* ... rest of your component JSX */}
    </div>
  );
}

export default AutomationPage;