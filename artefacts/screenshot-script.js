const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'src', 'assets', 'screenshots');

async function findNavLinks(page) {
  // Extract all navigation links to find policies and claims pages
  const links = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a, button'));
    return allLinks.map(el => ({
      text: el.textContent.trim().substring(0, 100),
      href: el.href || '',
      tag: el.tagName
    })).filter(l => l.text.length > 0 && l.text.length < 80);
  });
  return links;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Set longer timeouts for external site
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  try {
    // --- 1. Homepage ---
    console.log('Navigating to homepage...');
    await page.goto('https://www.sfbli.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // let animations settle
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home.png'),
      fullPage: true
    });
    console.log('Saved home.png');

    // Discover nav links
    const links = await findNavLinks(page);
    console.log('\nAll links found on homepage:');
    links.forEach(l => {
      if (l.href && l.href.startsWith('http')) {
        console.log(`  [${l.text}] -> ${l.href}`);
      }
    });

    // --- 2. Policies/Products page ---
    const policyKeywords = ['products', 'life insurance', 'policies', 'our products', 'insurance products', 'annuities', 'individual', 'offerings'];
    let policyUrl = null;

    for (const kw of policyKeywords) {
      const match = links.find(l =>
        l.text.toLowerCase().includes(kw) && l.href && l.href.startsWith('http')
      );
      if (match) {
        policyUrl = match.href;
        console.log(`\nFound policies page via "${kw}": ${policyUrl}`);
        break;
      }
    }

    if (!policyUrl) {
      // Try common URL patterns
      const tryUrls = [
        'https://www.sfbli.com/products',
        'https://www.sfbli.com/life-insurance',
        'https://www.sfbli.com/policies',
        'https://www.sfbli.com/insurance',
        'https://www.sfbli.com/individuals',
        'https://www.sfbli.com/our-products'
      ];
      for (const url of tryUrls) {
        try {
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          if (resp && resp.status() < 400) {
            policyUrl = url;
            console.log(`\nFound policies page by URL probing: ${policyUrl}`);
            break;
          }
        } catch (e) {
          // continue
        }
      }
    }

    if (policyUrl) {
      console.log(`Navigating to policies page: ${policyUrl}`);
      await page.goto(policyUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'policies.png'),
        fullPage: true
      });
      console.log('Saved policies.png');
    } else {
      console.log('Could not find policies page, taking screenshot of second most relevant page');
    }

    // --- 3. Claims page ---
    // Re-read links from current page in case nav changed
    const currentLinks = await findNavLinks(page);
    const allLinks = [...links, ...currentLinks];

    const claimsKeywords = ['claims', 'file a claim', 'report a claim', 'claim', 'policyholder', 'service', 'customer service', 'support'];
    let claimsUrl = null;

    for (const kw of claimsKeywords) {
      const match = allLinks.find(l =>
        l.text.toLowerCase().includes(kw) && l.href && l.href.startsWith('http')
      );
      if (match) {
        claimsUrl = match.href;
        console.log(`\nFound claims page via "${kw}": ${claimsUrl}`);
        break;
      }
    }

    if (!claimsUrl) {
      const tryUrls = [
        'https://www.sfbli.com/claims',
        'https://www.sfbli.com/file-a-claim',
        'https://www.sfbli.com/report-claim',
        'https://www.sfbli.com/customer-service',
        'https://www.sfbli.com/policyholders',
        'https://www.sfbli.com/contact',
        'https://www.sfbli.com/support'
      ];
      for (const url of tryUrls) {
        try {
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          if (resp && resp.status() < 400) {
            claimsUrl = url;
            console.log(`\nFound claims page by URL probing: ${claimsUrl}`);
            break;
          }
        } catch (e) {
          // continue
        }
      }
    }

    if (claimsUrl) {
      console.log(`Navigating to claims page: ${claimsUrl}`);
      await page.goto(claimsUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'claims.png'),
        fullPage: true
      });
      console.log('Saved claims.png');
    } else {
      console.log('Could not find claims page');
    }

    console.log('\nDone! Screenshots saved to:', SCREENSHOT_DIR);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
