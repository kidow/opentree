import { ui, defaultLang, type Lang, type UIKey } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, segment] = url.pathname.split('/');
  if (segment === 'ko') return 'ko';
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/**
 * Prefix an internal href with the locale segment when not the default.
 * Example: localizedHref('/docs', 'ko') -> '/ko/docs'
 */
export function localizedHref(href: string, lang: Lang): string {
  if (lang === defaultLang) return href;
  if (!href.startsWith('/')) return href;
  if (href === '/') return `/${lang}/`;
  return `/${lang}${href}`;
}

/**
 * Strip the locale segment from a path.
 * Example: stripLocale('/ko/docs/blocks') -> '/docs/blocks'
 */
export function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(ko)(\/.*)?$/);
  if (!match) return pathname;
  return match[2] ?? '/';
}
