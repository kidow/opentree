'use client';

import * as React from 'react';
import { FileText, Download, BookOpen, Home, Tag, Layers, Palette, Sparkles, Calendar, Globe, BarChart3, Search as SearchIcon, AlertTriangle, Server } from 'lucide-react';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';

const PAGES = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Download', href: '/download', icon: Download },
  { label: 'Documentation', href: '/docs', icon: BookOpen },
];

const DOCS = [
  { label: 'Block types', href: '/docs/blocks', icon: Layers },
  { label: 'Basic blocks', href: '/docs/blocks/basic', icon: Layers },
  { label: 'Media blocks', href: '/docs/blocks/media', icon: Layers },
  { label: 'Forms & email blocks', href: '/docs/blocks/forms', icon: Layers },
  { label: 'Commerce blocks', href: '/docs/blocks/commerce', icon: Layers },
  { label: 'Design', href: '/docs/design', icon: Palette },
  { label: 'AI editing', href: '/docs/ai-chat', icon: Sparkles },
  { label: 'Scheduling', href: '/docs/scheduling', icon: Calendar },
  { label: 'Deploy', href: '/docs/deploy', icon: Server },
  { label: 'Custom domains', href: '/docs/domains', icon: Globe },
  { label: 'SEO', href: '/docs/seo', icon: SearchIcon },
  { label: 'Multi-locale', href: '/docs/i18n', icon: Globe },
  { label: 'Analytics', href: '/docs/analytics', icon: BarChart3 },
  { label: 'Config schema', href: '/docs/schema', icon: FileText },
  { label: 'Troubleshooting', href: '/docs/troubleshooting', icon: AlertTriangle },
];

const EXTERNAL = [
  { label: 'GitHub repository', href: 'https://github.com/kidow/opentree', icon: GithubIcon, external: true },
  { label: 'Latest release', href: 'https://github.com/kidow/opentree/releases/latest', icon: Tag, external: true },
];

function isMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const [mac, setMac] = React.useState(true);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-full border border-hairline dark:border-hairline-dark bg-surface-soft dark:bg-white/[0.04] text-xs text-stone hover:border-stone hover:text-slate dark:hover:text-muted transition-colors min-w-[180px]"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-hairline dark:border-hairline-dark text-[10px] font-mono text-stone">
          {mac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, docs, links…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem key={p.href} value={`page ${p.label}`} onSelect={() => navigate(p.href)}>
                <p.icon className="text-stone" />
                <span>{p.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Docs">
            {DOCS.map((d) => (
              <CommandItem key={d.href} value={`docs ${d.label}`} onSelect={() => navigate(d.href)}>
                <d.icon className="text-stone" />
                <span>{d.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="External">
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
