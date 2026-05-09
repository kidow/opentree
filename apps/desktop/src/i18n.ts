import { useEffect, useState } from "react";

export type Lang = "ko" | "en";

const CATALOGS: Record<Lang, Record<string, string>> = {
  ko: {
    "tab.links": "Links",
    "tab.design": "Design",
    "tab.publish": "Publish",
    "tab.stats": "Stats",
    "tab.settings": "Settings",
    "action.save": "저장",
    "action.export": "내보내기",
    "action.undo": "실행 취소",
    "action.redo": "다시 실행",
    "action.aiChat": "✨ AI Chat",
    "action.closeChat": "✕ Chat 닫기",
    "settings.title": "Settings",
    "settings.connections": "연결",
    "settings.site": "사이트",
    "settings.project": "프로젝트",
    "settings.appInfo": "앱 정보",
    "settings.analytics": "Analytics",
    "settings.seo": "SEO",
    "settings.language": "언어",
    "settings.languageHint": "데스크톱 UI 언어. 페이지 locale은 별도 설정.",
    "seo.metaTitle": "메타 제목",
    "seo.metaTitleHint": "비우면 프로필 이름 사용",
    "seo.metaDescription": "메타 설명",
    "seo.metaDescriptionHint": "검색 결과/SNS 미리보기",
    "seo.ogImage": "OG 이미지 URL",
    "seo.ogImageHint": "비우면 프로필 아바타 사용",
    "seo.locale": "페이지 Locale (HTML lang)",
    "seo.localeHint": "예: ko, en, ja. 비우면 en",
    "design.title": "Design",
    "publish.title": "Publish",
    "stats.title": "Stats",
    "stats.refresh": "새로고침",
  },
  en: {
    "tab.links": "Links",
    "tab.design": "Design",
    "tab.publish": "Publish",
    "tab.stats": "Stats",
    "tab.settings": "Settings",
    "action.save": "Save",
    "action.export": "Export",
    "action.undo": "Undo",
    "action.redo": "Redo",
    "action.aiChat": "✨ AI Chat",
    "action.closeChat": "✕ Close Chat",
    "settings.title": "Settings",
    "settings.connections": "Connections",
    "settings.site": "Site",
    "settings.project": "Project",
    "settings.appInfo": "App info",
    "settings.analytics": "Analytics",
    "settings.seo": "SEO",
    "settings.language": "Language",
    "settings.languageHint": "Desktop UI language. Page locale is separate.",
    "seo.metaTitle": "Meta title",
    "seo.metaTitleHint": "Falls back to profile name",
    "seo.metaDescription": "Meta description",
    "seo.metaDescriptionHint": "Search result / social preview",
    "seo.ogImage": "OG image URL",
    "seo.ogImageHint": "Falls back to profile avatar",
    "seo.locale": "Page locale (HTML lang)",
    "seo.localeHint": "e.g. ko, en, ja. Defaults to en",
    "design.title": "Design",
    "publish.title": "Publish",
    "stats.title": "Stats",
    "stats.refresh": "Refresh",
  },
};

const STORAGE_KEY = "opentree-lang";
const EVENT = "opentree-lang-change";

let current: Lang = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "ko" || v === "en") return v;
  } catch { /* localStorage may be unavailable */ }
  return navigator.language?.startsWith("ko") ? "ko" : "en";
})();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

export function t(key: string): string {
  return CATALOGS[current][key] ?? key;
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(current);
  useEffect(() => {
    const h = () => setLangState(current);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return [lang, setLang];
}

export function useT(): (key: string) => string {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((n) => n + 1);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return t;
}
