// https://stackoverflow.com/a/65673222

import { bridgeApi } from "../src/preload";

declare global {
  interface Window {
    bridge: typeof bridgeApi;
  }
}
