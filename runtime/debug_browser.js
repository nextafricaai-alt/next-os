const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  const logs = [];
  page.on('console', m => logs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => errors.push({ where: 'pageerror', message: e.message, stack: e.stack }));
  page.on('requestfailed', r => errors.push({ where: 'requestfailed', url: r.url(), reason: r.failure()?.errorText }));
  try {
    await page.goto('http://127.0.0.1:8087/index.html', { waitUntil: 'networkidle0', timeout: 15000 });
  } catch (e) {
    errors.push({ where: 'goto', message: e.message });
  }
  await new Promise(r => setTimeout(r, 2000));
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 300) ?? '<NO ROOT>');
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) ?? '<NO BODY>');
  const winChecks = await page.evaluate(() => ({
    hasReact: typeof React !== 'undefined',
    hasOsData: typeof window.OS_DATA !== 'undefined',
    hasAppShell: typeof window.AppShell !== 'undefined',
    hasFleetPage: typeof window.FleetPage !== 'undefined',
    osDataKeys: typeof window.OS_DATA === 'object' && window.OS_DATA ? Object.keys(window.OS_DATA) : null,
  }));
  console.log(JSON.stringify({ rootHtml, bodyText, winChecks, errors, logs: logs.slice(-20) }, null, 2));
  await browser.close();
})();
