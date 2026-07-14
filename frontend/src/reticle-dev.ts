import { registerCapabilities } from "@reticlehq/react";

if (import.meta.env.DEV) {
  registerCapabilities({
    testids: [],
    signals: [],
    stores: [],
  });
}
