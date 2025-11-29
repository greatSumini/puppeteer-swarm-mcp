import { BrowserState } from "../types/browser-state.js";

export class BrowserStateManager {
  private state: BrowserState = 'not_launched';

  getState(): BrowserState {
    return this.state;
  }

  isLaunched(): boolean {
    return this.state === 'launched';
  }

  setLaunched(): void {
    this.state = 'launched';
  }

  setClosed(): void {
    this.state = 'not_launched';
  }
}

export const browserStateManager = new BrowserStateManager();
