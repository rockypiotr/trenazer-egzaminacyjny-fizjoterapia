import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const port = 4173;
const projectPath = encodeURIComponent(basename(projectDirectory));
const baseURL = `http://127.0.0.1:${port}/${projectPath}/`;

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory ..`,
    cwd: projectDirectory,
    url: baseURL,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 320, height: 720 } },
    },
  ],
});
