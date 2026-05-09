import { browser, $, expect } from "@wdio/globals";

describe("opentree desktop — smoke", () => {
  it("window opens and renders content", async () => {
    await browser.waitUntil(async () => {
      const title = await browser.getTitle();
      return title.length > 0;
    }, { timeout: 10_000, timeoutMsg: "window never produced a title" });
  });

  it("welcome screen is visible on first launch", async () => {
    // Welcome.tsx renders an "Open project" CTA when no project is loaded.
    const heading = await $("h1, h2");
    await heading.waitForDisplayed({ timeout: 10_000 });
    const text = await heading.getText();
    expect(text.length).toBeGreaterThan(0);
  });

  it("body has main app root mounted", async () => {
    const root = await $("#root");
    await expect(root).toBeExisting();
    const html = await root.getHTML();
    expect(html.length).toBeGreaterThan(50);
  });
});
