// Copies the web app (not the dev tools, tests or server) into www/ for Capacitor.
import { cpSync, rmSync, mkdirSync } from "node:fs";

const SRC = "../AR_Business_Card";
const FILES = ["index.html", "style.css", "app.js", "ui.js", "scene3d.js", "components.js", "gesture.js",
  "hand-tracker.js", "config.js", "assets"];

rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const f of FILES) cpSync(`${SRC}/${f}`, `www/${f}`, { recursive: true });
console.log("copied web app into www/");
