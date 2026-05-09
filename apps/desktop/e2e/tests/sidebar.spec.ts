import { browser, $, expect } from "@wdio/globals";

describe("opentree desktop — sidebar (after project load)", () => {
  // These tests assume a project has been opened. They are wired so the
  // suite can be extended once a stable fixture-project flow is in place
  // (e.g. via an env var pointing at a prepared opentree.config.json).
  // For now they're skipped if Welcome is still on screen.
  before(async function () {
    const sidebar = await $(".sidebar");
    if (!(await sidebar.isExisting())) {
      console.warn("Sidebar not present (still on Welcome) — skipping sidebar specs.");
      this.skip();
    }
  });

  it("renders the five primary tabs", async () => {
    for (const label of ["Links", "Design", "Publish", "Stats", "Settings"]) {
      const tab = await $(`.sidebar-nav-item*=${label}`);
      await expect(tab).toBeExisting();
    }
  });

  it("AI Chat toggle button is present", async () => {
    const chat = await $(".sidebar-chat-btn");
    await expect(chat).toBeExisting();
  });
});
