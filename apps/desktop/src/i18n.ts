import { useEffect, useState } from "react";

export type Lang = "ko" | "en";

const CATALOGS: Record<Lang, Record<string, string>> = {
  ko: {
    "tab.links": "Links",
    "tab.design": "Design",
    "tab.publish": "Publish",
    "tab.stats": "Stats",
    "tab.channels": "Channels",
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
    "settings.shortcutHint": "⌘, 로 설정 열기",
    "settings.needProject": "프로젝트를 먼저 열어주세요.",
    "statusbar.noProject": "프로젝트 없음",
    "statusbar.recent": "최근 프로젝트",
    "statusbar.newProject": "새 프로젝트",
    "statusbar.openFolder": "폴더 열기",
    "statusbar.versionTooltip": "릴리스 노트 보기",
    "statusbar.feedback": "피드백",
    "save.saving": "저장 중...",
    "save.failed": "저장 실패",
    "save.tooltipSaveNow": "지금 저장 (⌘S)",
    "feedback.title": "피드백 보내기",
    "feedback.intro": "제품 피드백은 GitHub Issue로 보내는 것이 가장 좋습니다.",
    "feedback.checkExisting": "새 이슈를 열기 전에 비슷한 이슈가 이미 있는지 확인해주세요. 있다면 중복 대신 추천(👍)이나 댓글을 남겨주세요.",
    "feedback.howToWrite": "새 이슈를 열 때는 재현 단계, 기대한 동작, 실제 동작을 함께 적어주시면 분류가 쉬워집니다.",
    "feedback.close": "닫기",
    "feedback.goToIssues": "이슈로 이동",
    "empty.noProject": "열린 프로젝트가 없습니다.",
    "update.available": "지금 업데이트",
    "update.installing": "업데이트 중...",
  },
  en: {
    "tab.links": "Links",
    "tab.design": "Design",
    "tab.publish": "Publish",
    "tab.stats": "Stats",
    "tab.channels": "Channels",
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
    "settings.shortcutHint": "Press ⌘, to open settings",
    "settings.needProject": "Open a project first.",
    "statusbar.noProject": "No project",
    "statusbar.recent": "Recent projects",
    "statusbar.newProject": "New project",
    "statusbar.openFolder": "Open folder",
    "statusbar.versionTooltip": "View release notes",
    "statusbar.feedback": "Feedback",
    "save.saving": "Saving...",
    "save.failed": "Save failed",
    "save.tooltipSaveNow": "Save now (⌘S)",
    "feedback.title": "Share feedback",
    "feedback.intro": "The best way to share product feedback is through a GitHub Issue.",
    "feedback.checkExisting": "Before opening a new issue, please check whether a similar one already exists. If it does, add an upvote or comment there instead of opening a duplicate.",
    "feedback.howToWrite": "When you do open a new issue, include the steps to reproduce, what you expected, and what actually happened so it is easier to triage.",
    "feedback.close": "Close",
    "feedback.goToIssues": "Go to Issues",
    "empty.noProject": "No project open.",
    "update.available": "Update Now",
    "update.installing": "Updating...",
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
