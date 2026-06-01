const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto('http://127.0.0.1:8085/NEXT%20OS%20Standalone.html', { waitUntil: 'networkidle0' });
  
  // Wait an extra 5 seconds for React to mount
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: 'puppeteer_screenshot.png' });
  
  console.log('Screenshot saved to puppeteer_screenshot.png');
  await browser.close();
})();
