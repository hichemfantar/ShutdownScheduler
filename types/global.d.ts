// https://stackoverflow.com/a/65673222
// https://www.electronjs.org/docs/latest/tutorial/context-isolation#usage-with-typescript

import { bridgeApi } from "../src/preload";

declare global {
  interface Window {
    bridge: typeof bridgeApi;
  }
}
