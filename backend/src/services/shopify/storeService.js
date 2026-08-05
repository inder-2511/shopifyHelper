import { chromium } from "playwright";
import fs from "fs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importProductsFromCSV } from "../../services/shopify/importCsvService.js";
import { setupMarkets } from "./setupMarkets.js";
import { setupShipping } from "./setupShippingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const BROWSER_DATA_DIR = "./playwright-user-data";
const SESSION_FILE = "auth-partner.json";
const PARTNER_STORES_URL = "https://dev.shopify.com/dashboard/129786666/stores";

// ─── Browser ────────────────────────────────────────────────────────────────

async function launchBrowser() {
  console.log("🌐 Launching Chromium browser (headless: false)...");
  const ctx = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
  console.log("✅ Browser launched");
  return ctx;
}

// ─── Session ─────────────────────────────────────────────────────────────────

async function restoreSession(context) {
  if (!fs.existsSync(SESSION_FILE)) {
    console.log("ℹ️  No saved session found — will log in fresh");
    return;
  }
  console.log("🔄 Restoring saved session cookies...");
  const storage = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  await context.addCookies(storage.cookies);
  console.log("✅ Session restored");
}

async function saveSession(context) {
  console.log("💾 Saving session to disk...");
  await context.storageState({ path: SESSION_FILE });
  console.log("✅ Session saved");
}

// ─── Login ───────────────────────────────────────────────────────────────────

async function ensureLoggedIn(page, context) {
  console.log(`🔗 Navigating to partner dashboard...`);
  await page.goto(PARTNER_STORES_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const emailInput = page.locator("#account_email");
  const emailVisible = await emailInput.isVisible().catch(() => false);
  if (!emailVisible) {
    console.log("✅ Already logged in — skipping login");
    return;
  }

  console.log("🔐 Login required — filling credentials...");
  console.log(`   Email: ${process.env.USER_EMAIL}`);

  await emailInput.fill(process.env.USER_EMAIL);
  console.log("   Clicking 'Continue with email'...");
  await page.locator('button:has-text("Continue with email")').click();
  await page
    .waitForLoadState("networkidle", { timeout: 15000 })
    .catch(() => {});

  console.log("   Waiting for password field...");
  const passwordInput = page.locator("#account_password");
  await passwordInput.waitFor({ state: "attached", timeout: 15000 });

  console.log("   Filling password...");
  const filled = await page.evaluate((pwd) => {
    const input = document.querySelector("#account_password");
    if (!input) return false;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    nativeSetter.call(input, pwd);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, process.env.USER_PASSWORD);

  if (!filled) throw new Error("Could not fill password field");

  console.log("   Submitting login form...");
  await page.evaluate(() => {
    const btn =
      document.querySelector('button[type="submit"]') ||
      document.querySelector("div.footer-form-submit");
    btn?.click();
  });

  await page.waitForTimeout(5000);
  console.log("✅ Login successful");
  await saveSession(context);
}

// ─── Store Creation ───────────────────────────────────────────────────────────

async function createDevStore(page, storeName) {
  console.log(`\n🏗️  Creating dev store: "${storeName}"`);
  console.log("   Waiting for partner dashboard to load...");
  await page.waitForTimeout(3000);

  console.log("   Clicking 'Add dev store'...");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Add dev store" }).click({ delay: 120 });
  const storePage = await popupPromise;

  console.log("   Store setup popup opened — waiting for form...");
  await storePage.waitForLoadState("domcontentloaded");
  await storePage.waitForTimeout(3000);

  const nameField = storePage.locator('input[name="storeName"]');
  await nameField.waitFor({ state: "visible", timeout: 15000 });

  console.log(`   Typing store name: "${storeName}"...`);
  for (const char of storeName) {
    await nameField.type(char, { delay: 80 + Math.random() * 80 });
  }

  console.log("   Selecting plan: Advanced...");
  await storePage.waitForTimeout(1500);
  await storePage
    .locator('select[name="Shopify plan"]')
    .selectOption("Advanced");

  console.log("   Submitting store creation form...");
  await storePage.getByText("Create store").click({ delay: 100 });
  await storePage.waitForLoadState("domcontentloaded");
  await storePage.waitForTimeout(5000);

  const accountCard = storePage.getByRole("link", {
    name: new RegExp(process.env.USER_EMAIL, "i"),
  });
  if ((await accountCard.count()) > 0) {
    console.log("   Selecting account card...");
    await accountCard.click();
  }

  console.log("   Waiting for store admin to initialize (~20s)...");
  await storePage.waitForTimeout(20000);

  const storeNameLocator = storePage.locator(
    "div.Polaris-Box > div > span > p",
  );
  await storeNameLocator.waitFor({ state: "visible", timeout: 30000 });

  console.log("✅ Store created:", await storeNameLocator.innerText());

  return storePage;
}

// ─── Custom App Setup ─────────────────────────────────────────────────────────

async function enableCustomApps(storePage) {
  console.log("\n🔧 Enabling custom app development...");
  await storePage.goto(`${storePage.url()}/settings/apps/development/enable`, {
    waitUntil: "domcontentloaded",
  });
  await storePage.waitForTimeout(5000);

  const allowBtn = storePage.getByRole("button", {
    name: /allow custom app development/i,
  });
  if (await allowBtn.isVisible().catch(() => false)) {
    console.log("   Clicking 'Allow custom app development'...");
    await allowBtn.click({ delay: 120 });
    await storePage.waitForLoadState("networkidle");
    await storePage.waitForTimeout(5000);
    console.log("✅ Custom app development enabled");
  } else {
    console.log("✅ Custom app development already enabled");
  }
}

async function createLegacyApp(storePage) {
  console.log("\n📦 Creating legacy custom app...");
  console.log("   Clicking 'Create a legacy custom app'...");
  await storePage
    .getByRole("button", { name: "Create a legacy custom app" })
    .click({ delay: 120 });
  await storePage.waitForTimeout(4000);

  const appName = `AutomationApp${Date.now()}`;
  console.log(`   App name: ${appName}`);
  await storePage.locator('input[name="appName"]').fill(appName);
  await storePage.waitForTimeout(1500);

  console.log("   Submitting app creation...");
  await storePage
    .getByRole("button", { name: /^create app$/i })
    .click({ delay: 120 });
  await storePage.waitForLoadState("networkidle");
  await storePage.waitForTimeout(5000);
  console.log("✅ Legacy app created");
}

// ─── API Scopes ───────────────────────────────────────────────────────────────

async function configureApiScopes(storePage) {
  console.log("\n🔑 Configuring Admin API scopes...");
  console.log("   Clicking 'Configure Admin API scopes'...");
  await storePage.getByText("Configure Admin API scopes").click({ delay: 120 });
  await storePage.waitForLoadState("domcontentloaded");
  await storePage.waitForTimeout(5000);

  const checkboxes = storePage.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  console.log(`   Found ${count} scope checkboxes — enabling all...`);

  let enabled = 0;
  for (let i = 0; i < count; i++) {
    try {
      const checkbox = checkboxes.nth(i);
      if (!(await checkbox.isChecked())) {
        await checkbox.check({ force: true });
        await storePage.waitForTimeout(50);
        enabled++;
      }
    } catch {
      console.log(`   Skipping checkbox ${i}`);
    }
  }

  console.log(`   Enabled ${enabled} new scopes — saving...`);
  await storePage.waitForTimeout(2000);
  await storePage
    .getByRole("button", { name: /^save$/i })
    .first()
    .click({ delay: 120 });
  await storePage.waitForLoadState("networkidle");
  await storePage.waitForTimeout(5000);
  console.log("✅ API scopes saved");
}

// ─── App Install ──────────────────────────────────────────────────────────────

async function installApp(storePage) {
  console.log("\n📲 Installing app on store...");
  console.log("   Switching to Overview tab...");
  await storePage.locator('button[role="tab"]#overview').click({ delay: 120 });
  await storePage.waitForTimeout(5000);

  console.log("   Waiting for 'Install app' button...");
  const installBtn = storePage
    .locator('button:has-text("Install app")')
    .first();
  await installBtn.waitFor({ state: "visible", timeout: 30000 });
  console.log("   Clicking 'Install app'...");
  await installBtn.click({ delay: 120 });
  await storePage.waitForTimeout(3000);

  const confirmInstallBtn = storePage
    .getByRole("button", { name: /^Install$/ })
    .last();

  const isDisabled = await confirmInstallBtn.isDisabled().catch(() => true);
  if (isDisabled) {
    console.log("   Install button disabled — toggling configuration tab to refresh...");
    await storePage
      .locator('button[role="tab"]#configuration')
      .click({ delay: 120 });
    await storePage.waitForTimeout(2000);
    await storePage
      .locator('button[role="tab"]#overview')
      .click({ delay: 120 });
    await storePage.waitForTimeout(2000);
  }

  console.log("   Confirming installation...");
  await confirmInstallBtn.click({ delay: 120 });
  await storePage.waitForLoadState("networkidle");
  await storePage.waitForTimeout(5000);
  console.log("✅ App installed");
}

// ─── Token Capture ────────────────────────────────────────────────────────────

async function captureToken(storePage) {
  console.log("\n🔑 Capturing access token...");
  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`   Revealing token — attempt ${attempt}/5`);

    await storePage.evaluate(() => {
      const buttons = document.querySelectorAll("s-internal-button");
      for (const btn of buttons) {
        if (btn.innerText.includes("Reveal token once")) {
          btn.shadowRoot?.querySelector("button")?.click();
          break;
        }
      }
    });

    await storePage.waitForTimeout(3000);

    const inputs = storePage.locator('input[type="text"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const value = await inputs.nth(i).inputValue();
      if (value?.startsWith("shpat_")) {
        console.log(`✅ Token captured: ${value.slice(0, 12)}...`);
        return value;
      }
    }

    console.log("   Token not visible yet, retrying...");
    await storePage.waitForTimeout(2000);
  }

  throw new Error("Failed to capture Shopify token after 5 attempts");
}

// ─── API Version ─────────────────────────────────────────────────────────────

async function fetchApiVersion(storePage) {
  console.log("\n📋 Fetching API version from app configuration...");
  console.log("   Opening configuration tab...");

  const configurationTab = storePage.locator("#app-configuration");
  await configurationTab.waitFor({ state: "visible", timeout: 30000 });
  await configurationTab.click({ delay: 120 });
  await storePage.waitForTimeout(4000);

  console.log("   Reading webhook API version code...");
  const webhookCode = storePage
    .locator("code")
    .filter({ hasText: /^\d{4}-\d{2}$/ })
    .last();

  await webhookCode.waitFor({ state: "visible", timeout: 15000 });
  const webhookVersion = await webhookCode.innerText();

  console.log(`✅ API version: ${webhookVersion}`);
  return webhookVersion;
}
// ─── Product Import ───────────────────────────────────────────────────────────

async function importProducts(storeName, storeUrl, token, locationGid = null) {
  console.log("\n📦 Starting product import from CSV...");
  const tempEnvPath = `./temp-store-env/${storeName}.env`;

  fs.writeFileSync(
    tempEnvPath,
    `SHOPIFY_STORE=${storeUrl}\nSHOPIFY_ACCESS_TOKEN=${token}\nSHOPIFY_API_VERSION=${process.env.SHOPIFY_API_VERSION}\n`,
  );

  const products = await importProductsFromCSV(
    "./csv/products.csv",
    storeUrl,
    token,
    locationGid,
  );
  console.log("✅ All products imported");

  fs.unlinkSync(tempEnvPath);
  return products;
}

// ─── Payment Provider ─────────────────────────────────────────────────────────

async function activatePaymentProvider(storePage, storeName) {
  const url = `https://admin.shopify.com/store/${storeName}/settings/payments/third-party-providers/24`;
  console.log("\n💳 Activating payment provider...");
  console.log(`   Navigating to: ${url}`);

  await storePage.goto(url, { waitUntil: "domcontentloaded" });
  await storePage.waitForTimeout(4000);

  console.log("   Clicking Activate button...");
  await storePage
    .getByRole("button", { name: "Activate" })
    .last()
    .click();

  await storePage.waitForLoadState("networkidle");
  await storePage.waitForTimeout(3000);
  console.log("✅ Payment provider activated");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractStoreUrl(adminUrl) {
  const handle = adminUrl.split("/store/")[1]?.split("/")[0];
  return `${handle}.myshopify.com`;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function createStoreAutomation(storeData) {
  console.log("=".repeat(50));
  console.log(`🚀 Starting store creation: "${storeData.storeName}"`);
  console.log("=".repeat(50));

  const context = await launchBrowser();
  const page = await context.newPage();

  try {
    await restoreSession(context);
    await ensureLoggedIn(page, context);

    const storePage = await createDevStore(page, storeData.storeName);

    await enableCustomApps(storePage);
    await createLegacyApp(storePage);
    await configureApiScopes(storePage);
    await installApp(storePage);

    const token = await captureToken(storePage);
    const apiVersion = await fetchApiVersion(storePage);
    const storeUrl = extractStoreUrl(storePage.url());
    const partnerUrl = page.url();
    const appUrl = `https://admin.shopify.com/store/${storeData.storeName}/apps/mcsl-qa`;

    console.log(`\n📍 Store URL: ${storeUrl}`);
    console.log(`📍 API Version: ${apiVersion}`);

    console.log("\n" + "─".repeat(50));
    console.log("⚙️  Configuring Markets...");
    console.log("─".repeat(50));
    await setupMarkets(storeUrl, token);
    console.log("✅ Markets configured");

    console.log("\n" + "─".repeat(50));
    console.log("🚚 Configuring Shipping...");
    console.log("─".repeat(50));
    const { locationId } = await setupShipping(storeUrl, token);
    console.log("✅ Shipping configured");

    console.log("\n" + "─".repeat(50));
    console.log("🛍️  Importing Products...");
    console.log("─".repeat(50));
    const { simpleProducts, variableProducts, digitalProducts } =
      await importProducts(storeData.storeName, storeUrl, token, locationId);

    console.log("\n" + "─".repeat(50));
    console.log("💳 Activating Payment Provider...");
    console.log("─".repeat(50));
    await activatePaymentProvider(storePage, storeData.storeName);

    const result = {
      success: true,
      storeName: storeData.storeName,
      storeUrl,
      partnerUrl,
      appUrl,
      token,
      apiVersion,
      simpleProducts,
      variableProducts,
      digitalProducts,
    };
    console.log("\n" + "=".repeat(50));
    console.log("🎉 STORE CREATION COMPLETE");
    console.log("=".repeat(50));
    console.log(`   Store:       ${storeUrl}`);
    console.log(`   API Version: ${apiVersion}`);
    console.log(`   Simple products:   ${simpleProducts.length}`);
    console.log(`   Variable products: ${variableProducts.length}`);
    console.log(`   Digital products:  ${digitalProducts.length}`);

    const envContent = `SHOPIFY_STORE=${storeUrl}
SHOPIFY_ACCESS_TOKEN=${token}
SHOPIFY_API_VERSION=${apiVersion}
PARTNER_URL=${partnerUrl}
APP_URL=${appUrl}
SIMPLE_PRODUCTS_JSON=${JSON.stringify(simpleProducts)}
VARIABLE_PRODUCTS_JSON=${JSON.stringify(variableProducts)}
DIGITAL_PRODUCTS=${JSON.stringify(digitalProducts)}
`;
    fs.writeFileSync(`./stores/${storeData.storeName}.env`, envContent);
    console.log(`\n💾 Env file saved: ./stores/${storeData.storeName}.env`);

    return result;
  } finally {
    await context.close();
  }
}
