import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/eksempel", "/avklare-rettighetskategori", "/graderte-andre-ytelser"];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
page.on("pageerror", (err) => errors.push(err.message));
for (const path of pages) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const name = (path === "/" ? "home" : path.slice(1)) + (process.env.SUFFIX ?? "");
  await page.screenshot({ path: `screenshots/${name}.png` });
  await page.screenshot({ path: `screenshots/${name}-full.png`, fullPage: true });
}
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
