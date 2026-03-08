# opentree Fumadocs Docs Site Plan

## 1. 목표와 전제

### 목표

`opentree`는 현재 `README.md`와 CLI help를 중심으로 안내되는 `CLI-first link-in-bio generator`다. 웹사이트형 사용자 가이드의 목표는 다음 3가지를 동시에 만족하는 것이다.

1. 신규 사용자가 README를 정독하지 않아도 `설치 -> init -> 편집 -> build -> deploy`까지 따라갈 수 있어야 한다.
2. 문서의 설명 단위가 소스코드의 실제 동작과 어긋나지 않아야 한다.
3. CLI 제품의 성격상 "예쁜 소개 페이지"보다 "빠르게 이해되는 작업 흐름 + 정확한 레퍼런스"가 우선되어야 한다.

### 코드베이스 기준 전제

현재 리포지토리는 웹앱이 아니라 npm 배포용 CLI 패키지다.

- 루트 `package.json`은 `opentree-cli` 패키지 자체를 정의한다.
- 실행 진입점은 `bin/opentree.js`이고, 실제 명령 분기는 `src/cli.js`에 있다.
- 설정 계약은 `opentree.config.json`, `src/config.js`, `opentree.schema.json`, `src/schema.js`에 모여 있다.
- 핵심 사용자 흐름은 `src/init.js`, `src/edit.js`, `src/import.js`, `src/prompt.js`, `src/build.js`, `src/dev.js`, `src/deploy.js`, `src/doctor.js`, `src/vercel.js`에 나뉘어 있다.
- 주요 예제와 기대 결과는 `README.md`, `scripts/cli-smoke.js`, `test/cli.test.js`에 이미 존재한다.

이 구조 때문에 Fumadocs를 루트 패키지에 직접 섞는 방식은 비추천이다. 문서 사이트는 "리포지토리 내부의 별도 앱"으로 두고, CLI 패키지와 배포/의존성을 분리한 뒤 Vercel에 별도 프로젝트로 올리는 편이 안전하다.

## 2. 권장 아키텍처

### 권장안

리포지토리 내부에 별도 Next.js + Fumadocs 앱을 추가한다.

- 권장 경로: `apps/docs`
- 현재 이 문서가 들어가는 루트 `docs/` 폴더는 기획/운영용 문서 보관용으로 유지
- 실제 Fumadocs 콘텐츠는 `apps/docs/content/docs` 아래에 작성

이 구성이 좋은 이유는 다음과 같다.

- 루트 `package.json`은 npm publish 대상이므로 docs 전용 의존성을 섞지 않는 편이 낫다.
- 현재 리포지토리는 workspace 구성이 아니다. docs 앱을 분리하면 monorepo 전환 없이도 시작할 수 있다.
- CLI와 문서 사이트의 배포 주기를 분리할 수 있다.
- Vercel에서 `apps/docs`만 별도 프로젝트로 연결하기 쉽다.

### 추천 디렉터리 구조

```text
apps/
  docs/
    app/
      layout.tsx
      page.tsx
      docs/
        layout.tsx
        [[...slug]]/
          page.tsx
      api/
        search/
          route.ts
    components/
      home/
      docs/
    content/
      docs/
        index.mdx
        getting-started/
        guides/
        reference/
        examples/
        operations/
    lib/
      source.ts
      layout.shared.tsx
    public/
    source.config.ts
    next.config.mjs
    package.json
    tsconfig.json
    postcss.config.mjs
    app.css
docs/
  fumadocs-site-plan.md
```

### 패키지 관리 전략

초기에는 루트 전체를 workspace로 바꾸지 말고, docs 앱만 독립적으로 관리하는 편이 좋다.

- 루트 스크립트 예시
  - `docs:dev`: `npm --prefix apps/docs run dev`
  - `docs:build`: `npm --prefix apps/docs run build`
- 장점
  - CLI 패키지의 배포 구조를 거의 건드리지 않는다.
  - 문서 사이트 도입만으로 저장소 운영 방식이 크게 바뀌지 않는다.

### Vercel 배포 기준

이 계획은 문서 사이트를 Vercel에 배포한다는 전제를 기본값으로 둔다.

- docs 앱은 CLI와 분리된 별도 Vercel 프로젝트로 운영한다.
- Vercel 프로젝트의 Root Directory는 `apps/docs`로 둔다.
- Framework Preset은 Next.js를 사용한다.
- Install Command는 `npm install`, Build Command는 `npm run build`를 `apps/docs` 기준으로 실행한다.
- Production Branch는 저장소의 기본 브랜치를 따른다.
- Pull Request마다 Vercel Preview Deployment가 생성되도록 GitHub 연동을 켠다.
- 문서 정식 도메인은 가능하면 `docs.<service-domain>` 형태의 별도 서브도메인으로 둔다.

즉, docs 사이트는 "CLI 패키지의 부속 정적 파일"이 아니라 "같은 저장소 안의 별도 Vercel 앱"으로 보는 것이 맞다.

## 3. Fumadocs 적용 방향

공식 Fumadocs 문서 기준으로, 기존 코드베이스에 붙일 때 필요한 최소 구조는 아래와 같다.

- Fumadocs Quick Start: automatic installation 기준 Node.js 20 이상 요구
- Next.js manual installation: Next.js 16, Tailwind CSS 4, `source.config.ts`, `next.config.mjs`, `lib/source.ts`, `RootProvider`, docs layout/route, search route 필요
- Page Tree: `content/docs`와 `meta.json` 기반으로 사이드바 구조 제어 가능
- Search: 기본 Orama 검색 사용 가능. 서버 API 방식 또는 static index 방식 선택 가능
- Static Build: 필요하면 Next.js static export도 가능

### 이 리포지토리와의 호환성 판단

- `package.json`의 Node 엔진이 `>=22.12.0` 이므로 Fumadocs의 Node 최소 요구사항과 충돌하지 않는다.
- 다만 현재 프로젝트에는 Next.js, Tailwind CSS, TypeScript가 없으므로 docs 앱에서만 새로 도입해야 한다.
- 따라서 "루트 애플리케이션 확장"보다 "루트 저장소 안의 별도 docs 앱 추가"가 맞다.

### 기본 구현 원칙

1. docs 앱의 홈 `/`는 소개 랜딩 페이지로 사용한다.
2. 실제 문서는 `/docs/*` 아래 Fumadocs route로 둔다.
3. `lib/source.ts`의 `baseUrl`은 `/docs`로 잡는다.
4. 1차 배포는 Vercel의 Next.js 서버 모드 + 기본 Orama 검색으로 간다.
5. static export는 특별한 비용/성능 요구가 생길 때만 재검토한다.

이렇게 하면 초기 복잡도를 낮추면서도, Vercel Preview/Production 흐름을 바로 활용할 수 있다. 정적 호스팅으로 바꾸는 일은 현재 계획의 기본 경로가 아니다.

## 4. 문서 사이트에서 무엇을 안내해야 하는가

### 제품 특성에 맞는 정보 구조

`opentree`는 SaaS 관리 콘솔이 아니라 CLI 도구다. 따라서 문서의 중심 축은 기능 목록이 아니라 작업 흐름이어야 한다.

권장 문서 축은 다음과 같다.

1. 시작하기: 처음 설치하고 첫 페이지를 띄우는 흐름
2. 가이드: 실제 작업 단위별 설명
3. 레퍼런스: 명령어와 설정 스키마를 정확히 찾는 영역
4. 예제: 자주 쓰는 설정 조합과 결과물
5. 운영: 배포, 진단, 릴리스, 유지보수

여기서 "배포"는 docs 사이트 자체도 Vercel에 배포된다는 점을 전제로 설명해야 한다. 즉, CLI 사용자가 `opentree deploy`로 자신의 링크 페이지를 올리는 흐름과, 저장소 관리자가 docs 앱을 Vercel에 올리는 흐름이 문서상에서 명확히 구분되어야 한다.

### 코드베이스 기반 핵심 주제

아래 항목은 반드시 문서화되어야 한다.

- `init`로 starter config 생성
- `interactive`로 프롬프트 기반 초기 설정
- `profile/site/meta/theme/link` 계열 편집 명령
- `import links`와 `prompt`
- `validate`, `build`, `dev`
- `doctor`, `vercel link/status/unlink`, `deploy`
- `schemaVersion`, config schema, JSON output contract
- `glass` / `terminal` 템플릿
- `analytics.clickTracking`의 `off|local`
- social card, OG image, QR code, generated favicon/sitemap/robots

## 5. 추천 사이트 정보 구조

### 상단 구조

- `/`
  - 제품 소개 랜딩
- `/docs`
  - 문서 홈
- `/docs/getting-started/*`
- `/docs/guides/*`
- `/docs/reference/*`
- `/docs/examples/*`
- `/docs/operations/*`

### 권장 콘텐츠 트리

```text
content/docs/
  index.mdx
  getting-started/
    meta.json
    installation.mdx
    quick-start.mdx
    interactive-setup.mdx
  guides/
    meta.json
    config-file.mdx
    editing-profile.mdx
    editing-links.mdx
    import-and-prompt.mdx
    preview-and-build.mdx
    deploy-to-vercel.mdx
    doctor-and-troubleshooting.mdx
  reference/
    meta.json
    cli-commands.mdx
    config-schema.mdx
    json-output.mdx
    templates-presets-and-analytics.mdx
  examples/
    meta.json
    minimal-config.mdx
    terminal-template.mdx
    production-ready-config.mdx
  operations/
    meta.json
    release-workflow.mdx
    docs-maintenance.mdx
```

### `meta.json` 운영 원칙

초기에는 Fumadocs의 root folder tab까지 쓰지 말고, 일반 folder + `meta.json`으로 충분히 제어한다.

- 이유
  - 지금 단계에서는 버전 탭이나 제품군 탭보다 "한 번에 탐색되는 문서"가 더 중요하다.
  - 페이지가 아직 많지 않다.
  - root folder는 문서 영역을 분리하기 좋지만, 초반에는 오히려 사용자가 다른 섹션을 놓치기 쉽다.

대신 `meta.json`의 `pages` 순서를 이용해 다음 순서를 고정한다.

1. 시작하기
2. 핵심 가이드
3. 레퍼런스
4. 운영 문서

## 6. 페이지별 상세 계획

### A. 홈 랜딩 `/`

문서 홈과 별개로, 랜딩 페이지는 README를 압축한 "제품 설명 + 첫 행동 유도" 역할을 해야 한다.

#### 홈에 꼭 들어갈 섹션

1. Hero
   - 한 줄 설명: "CLI-first link-in-bio generator"
   - CTA: `5분 시작하기`, `설정 스키마 보기`, `GitHub`
2. How it works
   - `init -> edit -> build -> deploy` 4단계 카드
3. Why opentree
   - 단일 config 기반
   - 정적 산출물 생성
   - Vercel 배포/진단 지원
   - JSON 출력으로 자동화 가능
4. Visual preview
   - `glass`와 `terminal` 두 템플릿 비교
5. Example config
   - `opentree.config.json` 축약 예시
6. CLI examples
   - Quick Start 3~5줄

#### 홈 카피의 근거 소스

- `README.md`의 Install / Quick Start / What It Does / Deploy Flow
- `src/build.js`의 generated output
- `src/catalog.js`의 template/preset/analytics 값

### B. 문서 홈 `/docs`

문서 홈은 기능 목록보다 "어디서 시작해야 하는지"를 빨리 보여줘야 한다.

#### 권장 블록

- 첫 사용자용 카드
  - 설치
  - Quick Start
  - interactive setup
- 이미 사용 중인 사용자용 카드
  - link 추가/편집
  - build/dev
  - deploy/doctor
- 레퍼런스 바로가기
  - CLI commands
  - config schema
  - JSON output

### C. 상세 페이지 매핑

| 문서 페이지 | 사용자가 해결하려는 질문 | 코드 기준 소스 | 꼭 포함할 내용 |
| --- | --- | --- | --- |
| `getting-started/installation` | 어떻게 설치하고 어떤 명령이 생기나? | `README.md`, `package.json` | 패키지명 `opentree-cli`, 실행 명령 `opentree`, Node 버전 |
| `getting-started/quick-start` | 가장 빠르게 결과를 보려면? | `README.md`, `scripts/cli-smoke.js` | init, link add, build, dev, 예상 파일 생성 결과 |
| `getting-started/interactive-setup` | 질문에 답하면서 시작할 수 있나? | `src/interactive.js`, `test/cli.test.js` | 질문 순서, config가 이미 있으면 실패함 |
| `guides/config-file` | config 파일이 무엇을 제어하나? | `src/init.js`, `src/config.js`, `opentree.schema.json` | 기본값, 필수 필드, 검증 규칙, schemaVersion |
| `guides/editing-profile` | 이름/바이오/테마/메타를 어떻게 바꾸나? | `src/edit.js` | `profile set`, `site set`, `meta set`, `theme set` |
| `guides/editing-links` | 링크를 추가/이동/삭제/프리셋으로 넣는 법은? | `src/edit.js`, `src/catalog.js` | `add/list/update/move/remove/preset`, 마지막 링크 제거 불가 |
| `guides/import-and-prompt` | 외부 JSON import와 자연어 shortcut은 어떻게 쓰나? | `src/import.js`, `src/prompt.js` | import 형식, `--replace`, prompt는 지원 패턴만 동작 |
| `guides/preview-and-build` | 미리보기와 실제 빌드는 어떻게 다른가? | `src/dev.js`, `src/build.js` | dev는 새로고침 기반, build 산출물 목록 |
| `guides/deploy-to-vercel` | 운영 URL에 배포하려면? | `src/deploy.js`, `src/vercel.js`, `src/preflight.js` | siteUrl 필요, vercel login, vercel link, deploy --prod |
| `guides/doctor-and-troubleshooting` | 뭐가 잘못됐는지 어떻게 진단하나? | `src/doctor.js`, `src/diagnostics.js`, `test/cli.test.js` | config/siteUrl/vercel/auth/link 점검 축 |
| `reference/cli-commands` | 전체 명령을 한눈에 보고 싶다 | `src/cli.js` | 명령 맵, task-oriented grouping |
| `reference/config-schema` | 각 필드 타입과 제약이 궁금하다 | `src/config.js`, `opentree.schema.json` | 표 형식 필드 설명, 허용값 |
| `reference/json-output` | 자동화용 JSON 출력 계약은? | `README.md`, 테스트 전반 | 공통 필드, stage 의미, additive compatibility |
| `reference/templates-presets-and-analytics` | 템플릿/프리셋/추가 기능은? | `src/build.js`, `src/catalog.js` | glass vs terminal, presets 4종, clickTracking, QR/social card |
| `operations/release-workflow` | 릴리스는 어떻게 관리하나? | `README.md`, `RELEASING.md`, `CHANGELOG.md` | versioning rules, checklist |
| `operations/docs-maintenance` | 문서와 코드 동기화는 어떻게 유지하나? | 본 계획 문서 | 문서 갱신 규칙, 리뷰 체크리스트, Vercel preview 확인 |

## 7. 문서 UX 원칙

### 문서를 "UI 친화적"으로 만드는 방법

이 제품에서 UI 친화적이라는 말은 장식보다 인지 부하를 낮추는 쪽에 가깝다.

#### 각 절차형 페이지의 공통 구조

모든 가이드 페이지는 아래 순서를 되도록 유지한다.

1. 이 페이지가 해결하는 문제
2. 선행 조건
3. 실행 명령
4. 실행 후 바뀌는 파일 또는 기대 결과
5. 확인 방법
6. 자주 나는 실패와 해결
7. 다음으로 갈 페이지

#### 문서 컴포넌트 사용 제안

- Step 컴포넌트: Quick Start, Deploy flow
- Callout: `siteUrl` 누락, Vercel 미로그인, prompt 지원 범위 주의
- Tab: `glass` vs `terminal` 비교
- Code block title: 파일명과 명령어를 분명히 표시
- 카드 링크: 시작하기/배포/트러블슈팅 진입점
- "Expected output" 박스: build 후 생성 파일, doctor 진단 예시
- Preview badge/notice: 이 페이지 변경은 Vercel Preview에서 먼저 검토된다는 운영 원칙 표시 가능

### 특히 주의할 표현

- `prompt`는 AI 에디터처럼 설명하면 안 된다.
  - 실제 구현은 `src/prompt.js`의 deterministic regex 규칙이다.
  - 문서에서는 "지원되는 자연어 shortcut" 정도로 표현하는 편이 정확하다.
- `dev`는 hot reload라고 쓰면 안 된다.
  - 실제 동작은 `src/dev.js` 기준 "config 수정 후 브라우저 새로고침"이다.
- `build`는 단순히 HTML만 만드는 것이 아니다.
  - `index.html`, `favicon.svg`, `opengraph-image.svg`
  - `siteUrl` 존재 시 `robots.txt`, `sitemap.xml`

## 8. Fumadocs 구현 계획

### Phase 0. 구조 준비

- `apps/docs` 신규 앱 생성
- Next.js 16 + Tailwind CSS 4 + TypeScript 구성
- Fumadocs MDX 설치
- 기본 app router 동작 확인
- Vercel 프로젝트에서 `apps/docs` Root Directory로 연결

### Phase 1. Fumadocs 최소 골격

공식 manual installation을 따라 아래 파일부터 만든다.

- `apps/docs/source.config.ts`
  - `content/docs`를 source로 지정
- `apps/docs/next.config.mjs`
  - `fumadocs-mdx/next`의 `createMDX` 적용
- `apps/docs/lib/source.ts`
  - `loader()`로 page tree/source 생성
  - `baseUrl: '/docs'`
- `apps/docs/app/layout.tsx`
  - `RootProvider` 적용
- `apps/docs/app/docs/layout.tsx`
- `apps/docs/app/docs/[[...slug]]/page.tsx`
- `apps/docs/app/api/search/route.ts`
  - 기본 Orama 검색 활성화
- Vercel Preview Deployment에서 `/`와 `/docs` 라우팅 정상 확인

### Phase 2. 정보 구조와 기본 콘텐츠

우선순위는 아래 순서가 좋다.

1. 홈 랜딩 `/`
2. 문서 홈 `/docs`
3. `getting-started/installation`
4. `getting-started/quick-start`
5. `guides/config-file`
6. `guides/preview-and-build`
7. `guides/deploy-to-vercel`
8. `reference/config-schema`
9. `reference/cli-commands`

이 9개만 있어도 README 의존도를 크게 줄일 수 있다.

### Phase 3. 레퍼런스 정교화

- 명령별 옵션 표 보강
- JSON output page 정리
- template/preset/analytics page 추가
- 예제 config 페이지 추가

### Phase 4. 운영성 강화

- 검색 품질 점검
- dead link 검사
- README에서 docs 사이트로 진입 경로 추가
- Vercel Preview URL을 기준으로 문서 리뷰 플로우 정리
- 필요하면 GitHub Actions에는 링크 검사나 콘텐츠 검증만 두고, 실제 배포는 Vercel에 맡긴다.

### Phase 5. 확장

- 다국어 문서 필요 시 Fumadocs i18n 적용
- 버전 문서 필요 시 Fumadocs navigation/versioning 전략 도입
- Vercel 운영 비용/성능 요구가 바뀔 때만 static export + static search 전환 검토

## 9. 문서 소스 오브 트루스 규칙

문서가 쉽게 낡는 지점은 명령어 옵션, 설정 필드, 예제 출력이다. 이를 막기 위한 규칙이 필요하다.

### 우선 기준

1. 명령 목록: `src/cli.js`
2. 설정 필드와 제약: `src/config.js`, `opentree.schema.json`
3. starter config: `src/init.js`
4. 실제 산출물: `src/build.js`
5. 운영/배포 규칙: `src/deploy.js`, `src/doctor.js`, `src/vercel.js`
6. 빠른 사용 예제: `scripts/cli-smoke.js`
7. 회귀 확인: `test/cli.test.js`
8. docs 앱 배포 설정: Vercel project settings, domain, preview flow

### 문서 갱신 규칙

- CLI 명령/옵션이 바뀌면 관련 MDX도 같은 PR에서 수정
- config 필드가 바뀌면 `reference/config-schema`와 예제 config 동시 수정
- build 산출물이 바뀌면 `preview-and-build`와 홈 랜딩의 feature 설명 수정
- deploy/doctor 메시지나 단계가 바뀌면 운영 문서 수정
- docs 관련 PR은 머지 전에 Vercel Preview Deployment에서 핵심 페이지 렌더링을 확인

### 장기적으로 고려할 자동화

- `src/cli.js` help text를 읽어 reference page 초안을 생성하는 스크립트
- `opentree.schema.json`을 읽어 필드 표를 생성하는 스크립트
- smoke test 예제를 docs quick start와 공유하는 템플릿화

초기에는 수동 작성이 빠르지만, `config-schema`와 `cli-commands`는 나중에 자동화 가치가 높다.

## 10. 검증 계획

### 기능 검증

- docs 앱 단독 `dev`/`build` 성공
- `/` 랜딩 렌더링 확인
- `/docs`와 주요 페이지 렌더링 확인
- 검색에서 `init`, `deploy`, `schemaVersion`, `prompt` 등 핵심 키워드 검색 가능
- Vercel Preview Deployment에서 라우팅, 검색, 정적 자산이 정상 동작

### 내용 검증

- Quick Start 명령이 실제 `scripts/cli-smoke.js` 흐름과 일치
- config schema 설명이 `src/config.js`와 불일치하지 않음
- deploy guide가 `siteUrl`, `vercel login`, `vercel link` 선행 조건을 빠뜨리지 않음
- prompt guide가 지원 범위를 과장하지 않음

### 운영 검증

- README에 docs 사이트 링크 추가
- 새 릴리스 체크리스트에 "docs drift 확인" 항목 추가
- 기본 브랜치 머지 후 Vercel Production Deployment가 정상 승격

## 11. 리스크와 대응

### 리스크 1. docs 앱 도입으로 저장소 복잡도 증가

대응:

- workspace 전환은 미루고 `apps/docs` 독립 앱으로 시작
- 루트 publish 구조는 유지
- Vercel도 `apps/docs`만 연결해 영향 범위를 제한

### 리스크 2. README와 웹 문서 중복

대응:

- README는 짧은 제품 소개 + 빠른 시작만 남기고
- 상세 설명은 docs 사이트로 이동
- README는 docs의 인덱스 역할만 하도록 정리
- docs canonical source는 Vercel에 배포된 사이트로 수렴

### 리스크 3. 코드와 문서의 드리프트

대응:

- 문서 페이지를 소스 파일 기준으로 매핑
- smoke test와 schema를 문서의 기준 데이터로 활용

### 리스크 4. 너무 이른 버전 문서화

대응:

- 현재는 `latest` 단일 문서만 운영
- 버전 분기는 CLI 1.x 이후 또는 breaking change 누적 시점에 검토

## 12. 최종 권장 순서

가장 현실적인 실행 순서는 아래와 같다.

1. `apps/docs`에 Fumadocs 최소 앱 골격 추가
2. 홈 랜딩 + `/docs` 인덱스 + Quick Start 3페이지 우선 작성
3. config/build/deploy/doctor 문서 추가
4. CLI/reference/schema 문서 추가
5. Vercel Preview/Production 흐름 점검
6. 검색/README 링크 연결

## 13. 완료 기준

이 계획이 성공적으로 구현되었다고 판단할 기준은 다음과 같다.

- 신규 사용자가 README만 보지 않고 docs 사이트만으로 첫 배포까지 갈 수 있다.
- `src/cli.js`에 있는 주요 명령이 모두 문서 IA 안에서 찾힌다.
- `opentree.config.json`의 필수/선택 필드를 문서에서 정확히 찾을 수 있다.
- `build`, `deploy`, `doctor`의 차이를 사용자가 UI 상에서 명확히 이해할 수 있다.
- docs 앱이 CLI 패키지 publish 구조를 망치지 않는다.
- docs 앱이 Vercel Preview/Production에서 안정적으로 배포되고 검토 가능하다.

## 14. 참고 링크

- [Fumadocs Quick Start](https://www.fumadocs.dev/docs)
- [Fumadocs Manual Installation](https://www.fumadocs.dev/docs/manual-installation)
- [Fumadocs Next.js Setup](https://www.fumadocs.dev/docs/manual-installation/next)
- [Fumadocs Page Slugs & Page Tree](https://www.fumadocs.dev/docs/headless/page-conventions)
- [Fumadocs Navigation](https://www.fumadocs.dev/docs/navigation)
- [Fumadocs Deploying](https://fumadocs.dev/docs/ui/deploying)
- [Fumadocs Static Build](https://fumadocs.dev/docs/ui/static-export)
- [Fumadocs Search: Orama](https://fumadocs.dev/docs/ui/search/orama)
