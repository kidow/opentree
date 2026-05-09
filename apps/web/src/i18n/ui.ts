export const languages = {
  en: 'English',
  ko: '한국어',
} as const;

export const defaultLang = 'en';

export const ui = {
  en: {
    'nav.docs': 'Docs',
    'nav.download': 'Download',
    'nav.search': 'Search',
    'nav.search.placeholder': 'Search pages, docs, links…',
    'nav.search.empty': 'No results found.',
    'nav.search.pages': 'Pages',
    'nav.search.docs': 'Docs',
    'nav.search.external': 'External',
    'lang.switch': 'Language',

    'sidebar.overview': 'Overview',
    'sidebar.editing': 'Editing',
    'sidebar.publishing': 'Publishing',
    'sidebar.reference': 'Reference',
    'sidebar.introduction': 'Introduction',
    'sidebar.blocks': 'Block types',
    'sidebar.blocks.basic': 'Basic',
    'sidebar.blocks.media': 'Media',
    'sidebar.blocks.forms': 'Forms & email',
    'sidebar.blocks.commerce': 'Commerce',
    'sidebar.design': 'Design',
    'sidebar.aichat': 'AI editing',
    'sidebar.scheduling': 'Scheduling',
    'sidebar.deploy': 'Deploy',
    'sidebar.domains': 'Custom domains',
    'sidebar.seo': 'SEO',
    'sidebar.i18n': 'Multi-locale',
    'sidebar.analytics': 'Analytics',
    'sidebar.schema': 'Config schema',
    'sidebar.troubleshooting': 'Troubleshooting',

    'footer.download': 'Download',
    'footer.github': 'GitHub',
    'footer.builtBy': 'Built by',

    'docs.label': 'Docs',
    'docs.titleSuffix': 'Opentree docs',
  },
  ko: {
    'nav.docs': '문서',
    'nav.download': '다운로드',
    'nav.search': '검색',
    'nav.search.placeholder': '페이지, 문서, 링크 검색…',
    'nav.search.empty': '결과가 없습니다.',
    'nav.search.pages': '페이지',
    'nav.search.docs': '문서',
    'nav.search.external': '외부 링크',
    'lang.switch': '언어',

    'sidebar.overview': '개요',
    'sidebar.editing': '편집',
    'sidebar.publishing': '게시',
    'sidebar.reference': '레퍼런스',
    'sidebar.introduction': '소개',
    'sidebar.blocks': '블록 타입',
    'sidebar.blocks.basic': '기본',
    'sidebar.blocks.media': '미디어',
    'sidebar.blocks.forms': '폼 & 이메일',
    'sidebar.blocks.commerce': '커머스',
    'sidebar.design': '디자인',
    'sidebar.aichat': 'AI 편집',
    'sidebar.scheduling': '스케줄링',
    'sidebar.deploy': '배포',
    'sidebar.domains': '커스텀 도메인',
    'sidebar.seo': 'SEO',
    'sidebar.i18n': '다국어',
    'sidebar.analytics': '애널리틱스',
    'sidebar.schema': '설정 스키마',
    'sidebar.troubleshooting': '문제 해결',

    'footer.download': '다운로드',
    'footer.github': 'GitHub',
    'footer.builtBy': '제작',

    'docs.label': '문서',
    'docs.titleSuffix': 'Opentree 문서',
  },
} as const;

export type Lang = keyof typeof ui;
export type UIKey = keyof (typeof ui)[typeof defaultLang];
