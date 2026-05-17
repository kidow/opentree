'use client';

import * as React from 'react';
import { FileText, Download, BookOpen, Home, Tag, Layers, Palette, Sparkles, Calendar, Globe, BarChart3, Search as SearchIcon, AlertTriangle, Server } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';

type Lang = 'en' | 'ko';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

const STRINGS = {
  en: {
    triggerLabel: 'Search',
    placeholder: 'Search pages, docs, links…',
    empty: 'No results found.',
    pages: 'Pages',
    docs: 'Docs',
    external: 'External',
    page: { home: 'Home', download: 'Download', docs: 'Documentation' },
    doc: {
      blocks: 'Block types',
      basic: 'Basic blocks',
      media: 'Media blocks',
      forms: 'Forms & email blocks',
      commerce: 'Commerce blocks',
      design: 'Design',
      ai: 'AI editing',
      sched: 'Scheduling',
      channels: 'Connect channels',
      connectVercel: 'Connect Vercel',
      connectCloudflare: 'Connect Cloudflare Pages',
      connectGithub: 'Connect GitHub Pages',
      domains: 'Custom domains',
      seo: 'SEO',
      i18n: 'Multi-locale',
      analytics: 'Analytics',
      schema: 'Config schema',
      trouble: 'Troubleshooting',
    },
    ext: { repo: 'GitHub repository', release: 'Latest release' },
  },
  ko: {
    triggerLabel: '검색',
    placeholder: '페이지, 문서, 링크 검색…',
    empty: '결과가 없습니다.',
    pages: '페이지',
    docs: '문서',
    external: '외부 링크',
    page: { home: '홈', download: '다운로드', docs: '문서' },
    doc: {
      blocks: '블록 타입',
      basic: '기본 블록',
      media: '미디어 블록',
      forms: '폼 & 이메일 블록',
      commerce: '커머스 블록',
      design: '디자인',
      ai: 'AI 편집',
      sched: '스케줄링',
      channels: '채널 연결',
      connectVercel: 'Vercel 연결',
      connectCloudflare: 'Cloudflare Pages 연결',
      connectGithub: 'GitHub Pages 연결',
      domains: '커스텀 도메인',
      seo: 'SEO',
      i18n: '다국어',
      analytics: '애널리틱스',
      schema: '설정 스키마',
      trouble: '문제 해결',
    },
    ext: { repo: 'GitHub 저장소', release: '최신 릴리스' },
  },
};

function localized(href: string, lang: Lang) {
  if (lang === 'en') return href;
  if (href === '/') return '/ko/';
  if (href.startsWith('/')) return `/ko${href}`;
  return href;
}

function isMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

interface SearchCommandProps {
  lang?: Lang;
}

export function SearchCommand({ lang = 'en' }: SearchCommandProps) {
  const [open, setOpen] = React.useState(false);
  const [mac, setMac] = React.useState(true);
  const s = STRINGS[lang];

  React.useEffect(() => {
    setMac(isMac());
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navigate = (href: string, external?: boolean) => {
    setOpen(false);
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = href;
    }
  };

  const PAGES = [
    { label: s.page.home, href: localized('/', lang), icon: Home },
    { label: s.page.download, href: localized('/download', lang), icon: Download },
    { label: s.page.docs, href: localized('/docs', lang), icon: BookOpen },
  ];

  const DOCS = [
    { label: s.doc.blocks, href: localized('/docs/blocks', lang), icon: Layers },
    { label: s.doc.basic, href: localized('/docs/blocks/basic', lang), icon: Layers },
    { label: s.doc.media, href: localized('/docs/blocks/media', lang), icon: Layers },
    { label: s.doc.forms, href: localized('/docs/blocks/forms', lang), icon: Layers },
    { label: s.doc.commerce, href: localized('/docs/blocks/commerce', lang), icon: Layers },
    { label: s.doc.design, href: localized('/docs/design', lang), icon: Palette },
    { label: s.doc.ai, href: localized('/docs/ai-chat', lang), icon: Sparkles },
    { label: s.doc.sched, href: localized('/docs/scheduling', lang), icon: Calendar },
    { label: s.doc.channels, href: localized('/docs/channels', lang), icon: BarChart3 },
    { label: s.doc.connectVercel, href: localized('/docs/connect/vercel', lang), icon: Server },
    { label: s.doc.connectCloudflare, href: localized('/docs/connect/cloudflare', lang), icon: Server },
    { label: s.doc.connectGithub, href: localized('/docs/connect/github', lang), icon: Server },
    { label: s.doc.domains, href: localized('/docs/domains', lang), icon: Globe },
    { label: s.doc.seo, href: localized('/docs/seo', lang), icon: SearchIcon },
    { label: s.doc.i18n, href: localized('/docs/i18n', lang), icon: Globe },
    { label: s.doc.analytics, href: localized('/docs/analytics', lang), icon: BarChart3 },
    { label: s.doc.schema, href: localized('/docs/schema', lang), icon: FileText },
    { label: s.doc.trouble, href: localized('/docs/troubleshooting', lang), icon: AlertTriangle },
  ];

  const EXTERNAL = [
    { label: s.ext.repo, href: 'https://github.com/kidow/opentree', icon: GithubIcon, external: true },
    { label: s.ext.release, href: 'https://github.com/kidow/opentree/releases/latest', icon: Tag, external: true },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={s.triggerLabel}
        className="inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-full border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-white/[0.04] text-xs text-stone hover:border-stone hover:text-slate dark:hover:text-muted transition-colors min-w-[180px]"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">{s.triggerLabel}</span>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-hairline dark:border-hairline-dark text-[10px] font-mono text-stone">
          {mac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={s.placeholder} />
        <CommandList>
          <CommandEmpty>{s.empty}</CommandEmpty>

          <CommandGroup heading={s.pages}>
            {PAGES.map((p) => (
              <CommandItem key={p.href} value={`page ${p.label}`} onSelect={() => navigate(p.href)}>
                <p.icon className="text-stone" />
                <span>{p.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={s.docs}>
            {DOCS.map((d) => (
              <CommandItem key={d.href} value={`docs ${d.label}`} onSelect={() => navigate(d.href)}>
                <d.icon className="text-stone" />
                <span>{d.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={s.external}>
            {EXTERNAL.map((e) => (
              <CommandItem key={e.href} value={`external ${e.label}`} onSelect={() => navigate(e.href, true)}>
                <e.icon className="text-stone" />
                <span>{e.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
