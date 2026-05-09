'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const languages: Record<string, string> = {
  en: 'English',
  ko: '한국어',
};

function stripLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] && Object.keys(languages).includes(parts[0]) && parts[0] !== 'en') {
    return '/' + parts.slice(1).join('/') || '/';
  }
  return pathname || '/';
}

function buildHref(lang: string, basePath: string): string {
  const clean = stripLocale(basePath);
  const normalized = clean === '' ? '/' : clean;
  if (lang === 'en') return normalized;
  return `/${lang}${normalized === '/' ? '/' : normalized}`;
}

interface LanguageSwitcherProps {
  lang: string;
  pathname: string;
}

export function LanguageSwitcher({ lang, pathname }: LanguageSwitcherProps) {
  const handleChange = (value: string) => {
    window.location.href = buildHref(value, pathname);
  };

  return (
    <Select value={lang} onValueChange={handleChange}>
      <SelectTrigger aria-label="Select language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(languages).map(([code, label]) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
