const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://127.0.0.1:8085/NEXT%20OS%20Standalone.html', { waitUntil: 'networkidle0' });
  
  // Wait a bit just in case
  await new Promise(r => setTimeout(r, 2000));
  
  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : 'NO ROOT DIV';
  });
  
  const appShellType = await page.evaluate(() => typeof window.AppShell);
  const reactType = await page.evaluate(() => typeof window.React);
  
  console.log('Root HTML:', rootHtml.substring(0, 500));
  console.log('window.AppShell type:', appShellType);
  console.log('window.React type:', reactType);
  
  await browser.close();
})();
