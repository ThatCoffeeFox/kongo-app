const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld(
  "kongoHost",
  Object.freeze({
    platform: process.platform,
    desktop: true,
    apiToken: process.env.KONGO_API_TOKEN || "",
  }),
);
