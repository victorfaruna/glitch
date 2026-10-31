import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "fs";

const COMMON_CHROME_PATHS = [
  process.env.CHROME_BIN,
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

export function getSystemBrowserPath(): string | undefined {
  for (const path of COMMON_CHROME_PATHS) {
    try {
      if (fs.existsSync(path)) {
        return path;
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

export interface ManagedBrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export async function createManagedBrowser(options?: {
  viewport?: { width: number; height: number };
  headless?: boolean;
}): Promise<ManagedBrowserSession> {
  const executablePath = getSystemBrowserPath();
  const headless = options?.headless !== false;

  const browser = await chromium.launch({
    executablePath,
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: options?.viewport || { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Glitch/0.1.0",
  });

  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    close: async () => {
      try {
        await page.close();
      } catch {
        // ignore
      }
      try {
        await context.close();
      } catch {
        // ignore
      }
      try {
        await browser.close();
      } catch {
        // ignore
      }
    },
  };
}
