import { LaunchOptions } from 'puppeteer';

// Common browser arguments for both NPX and Docker environments
const commonArgs = [
  "--disable-web-security",  // Bypass CORS
  "--disable-features=IsolateOrigins,site-per-process", // Disable site isolation
  "--disable-site-isolation-trials",
  "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" // Modern Chrome UA
];

// NPX configuration for local development
export const npxConfig: LaunchOptions = { 
  headless: false,
  args: commonArgs
};

// Docker configuration for containerized environment
export const dockerConfig: LaunchOptions = { 
  headless: true, 
  args: [
    "--no-sandbox",
    "--single-process",
    "--no-zygote",
    ...commonArgs
  ]
};

// Default navigation timeout in milliseconds
export const DEFAULT_NAVIGATION_TIMEOUT = 30000;
