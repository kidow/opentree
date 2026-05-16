import { describe, it, expect, beforeEach } from "vitest";
import { basename, getRecents, addRecent } from "./recents";

describe("recents", () => {
  beforeEach(() => window.localStorage.clear());

  it("basename derives folder name from unix and windows paths", () => {
    expect(basename("/Users/me/dev/my-links")).toBe("my-links");
    expect(basename("C:\\Users\\me\\portfolio")).toBe("portfolio");
    expect(basename("solo")).toBe("solo");
  });

  it("getRecents returns empty list when nothing stored", () => {
    expect(getRecents()).toEqual([]);
  });

  it("addRecent stores a project and getRecents reads it back", () => {
    addRecent("/dev/blog-bio");
    const list = getRecents();
    expect(list).toHaveLength(1);
    expect(list[0].path).toBe("/dev/blog-bio");
    expect(list[0].name).toBe("blog-bio");
  });

  it("addRecent moves an existing path to the front without duplicating", () => {
    addRecent("/dev/a");
    addRecent("/dev/b");
    addRecent("/dev/a");
    const list = getRecents();
    expect(list).toHaveLength(2);
    expect(list[0].path).toBe("/dev/a");
  });

  it("addRecent caps the list at 5 entries", () => {
    for (let i = 0; i < 8; i++) addRecent(`/dev/p${i}`);
    const list = getRecents();
    expect(list).toHaveLength(5);
    expect(list[0].path).toBe("/dev/p7");
  });
});
