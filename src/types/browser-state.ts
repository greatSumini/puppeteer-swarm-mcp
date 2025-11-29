export type BrowserState = 'not_launched' | 'launched';

export interface BrowserLaunchConfig {
  tabCount: number;
  headless: boolean;
  idleTimeout: number;
}
