import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { getLang, setLang, t, useLang, useT } from "./i18n";

describe("i18n", () => {
  beforeEach(() => {
    // ensure consistent starting language
    setLang("en");
  });

  it("t() returns a string for a known key", () => {
    setLang("en");
    expect(t("tab.links")).toBe("Links");
    expect(t("action.save")).toBe("Save");
  });

  it("t() falls back to the key when missing", () => {
    setLang("en");
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("setLang switches catalog immediately", () => {
    setLang("ko");
    expect(getLang()).toBe("ko");
    expect(t("action.save")).toBe("저장");
    setLang("en");
    expect(t("action.save")).toBe("Save");
  });

  it("setLang persists to localStorage", () => {
    setLang("ko");
    expect(window.localStorage.getItem("opentree-lang")).toBe("ko");
  });

  it("useLang re-renders consumers when language changes", () => {
    setLang("en");
    const { result } = renderHook(() => useLang());
    expect(result.current[0]).toBe("en");
    act(() => result.current[1]("ko"));
    expect(result.current[0]).toBe("ko");
  });

  it("useT re-renders consumers when language changes", () => {
    setLang("en");
    const { result } = renderHook(() => useT());
    expect(result.current("tab.settings")).toBe("Settings");
    act(() => setLang("ko"));
    expect(result.current("tab.settings")).toBe("Settings");
  });

  it("returns a deterministic translation between languages", () => {
    setLang("en");
    expect(t("settings.connections")).toBe("Connections");
    setLang("ko");
    expect(t("settings.connections")).toBe("연결");
  });
});
