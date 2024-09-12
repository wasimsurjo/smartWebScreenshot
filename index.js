const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

chromium.use(stealth);

function getDomainName(url) {
    try {
        const parsedUrl = new URL(url);
        const hostnameParts = parsedUrl.hostname.split('.');
        return hostnameParts[hostnameParts.length - 2];
    } catch (err) {
        console.error('Failed to get domain name:', err);
        return Math.random().toString(36).substring(7);
    }
}

function getRandomUserAgent(userAgent = null) {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15'
    ];
    return userAgent || userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function closePopups(page) {
    const closePopupSelectors = [
        'div[aria-label="Close"]', // Common close button attribute
        '.x1i10hfl[role="button"]' // Specific class and role
    ];

    for (const selector of closePopupSelectors) {
        try {
            const elements = await page.$$(selector);
            for (const element of elements) {
                if (await element.isVisible()) {
                    await element.click();
                    console.log(`Closed popup using selector: ${selector}`);
                    return;
                }
            }
        } catch (err) {
            console.error('Error closing popup:', err);
        }
    }
}


async function takeScreenshot(url, userAgent = null, proxy = null, screenDimensions = '1920,1080', scroll = false, closePopup = true, headless = true) {
    const browser = await chromium.launch({
        headless,
        args: [
            `--window-size=${screenDimensions}`,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            ...(proxy ? [`--proxy-server=${proxy}`] : [])
        ]
    });

    const context = await browser.newContext({
        userAgent: getRandomUserAgent(userAgent),
        viewport: { width: parseInt(screenDimensions.split(',')[0]), height: parseInt(screenDimensions.split(',')[1]) },
        ...(proxy ? { proxy: { server: proxy } } : {})
    });

    const page = await context.newPage();

    try {
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
            if (url.includes('x.com')) {
                await handleX(page);
            } else if (url.includes('linkedin.com')) {
                await closeLinkedInPopups(page);
            }
        } catch (err) {
            console.error('Error with networkidle:', err);
        }

        if (closePopup) {
            await closePopups(page);
        }
        if (scroll) {
            await autoScroll(page);
        }
        const domainName = getDomainName(url);
        const screenshotPath = path.resolve(`${domainName}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved as ${screenshotPath}`);

    } catch (err) {
        console.error('Error taking screenshot:', err);
    } finally {
        await browser.close();
    }
}
async function handleX(page) {
    try {
        // Check for specific login elements and handle login if necessary
        await page.waitForSelector('input[name="username"]', { timeout: 10000 });
        await page.fill('input[name="username"]', 'your-username');
        await page.fill('input[name="password"]', 'your-password');
        await page.click('button[type="submit"]');
        // Wait for navigation or any post-login elements
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        console.log('Successfully handled X login');
    } catch (err) {
        console.error('Error handling X login:', err);
    }
}
async function closeLinkedInPopups(page) {
    const popupSelectors = [
        'div[aria-label="Close"]', // Common close button attribute
        '.modal-close-button', // Example class (adjust as needed)
        'button[aria-label="Close"]' // Another common popup close button
    ];

    for (const selector of popupSelectors) {
        try {
            const elements = await page.$$(selector);
            for (const element of elements) {
                if (await element.isVisible()) {
                    await element.click();
                    console.log(`Closed LinkedIn popup using selector: ${selector}`);
                    return;
                }
            }
        } catch (err) {
            console.error('Error closing LinkedIn popup:', err);
        }
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

const url = 'https://bot.sannysoft.com';
takeScreenshot(url);