# opentree 구현 계획서

## 현재 부트스트랩 상태

패키지 이름은 `opentree-cli`이고, 전역 설치 후 실행 명령은 `opentree`다.

### 설치 예정 형태

```bash
npm install -g opentree-cli
opentree init --name "Kidow" --bio "CLI-first profile" --site-url "https://links.example.com" --title "Kidow Links"
opentree validate
opentree build
opentree dev
opentree deploy
opentree doctor
opentree doctor --json
opentree config show
opentree profile set --name "Kidow"
opentree site set --url "https://links.example.com"
opentree meta set --title "Kidow Links" --description "Find my work." --og-image-url "https://cdn.example.com/og.png"
opentree link list
opentree link add --title "Docs" --url "https://example.com/docs"
opentree link update --index 1 --title "GitHub Profile"
opentree link move --from 3 --to 1
opentree link remove --index 1
opentree theme set --accent-color "#0f766e"
```

`opentree init`를 실행하면 현재 디렉터리에 `opentree.config.json`이 생성된다.
`opentree validate`는 그 설정 파일이 다음 단계로 넘어가도 되는지 검증한다.
`opentree build`는 검증된 설정으로 `dist/index.html` 정적 페이지를 생성한다.
생성된 설정에는 `siteUrl`과 `metadata` 기본 필드도 포함되며, 이 값들은 canonical URL, Open Graph, Twitter 카드 메타 태그 생성에 사용된다.
`siteUrl`이 설정되어 있으면 `opentree build`는 `dist/sitemap.xml`과 `dist/robots.txt`도 함께 생성한다.
`opentree dev`는 로컬 미리보기 서버를 띄우고, 설정 파일 수정 내용을 새로고침만으로 반영한다.
`opentree deploy`는 먼저 `dist`를 빌드한 뒤 Vercel CLI로 그 결과물을 배포한다.
`opentree doctor`는 config 유효성, `siteUrl`, Vercel CLI 설치 여부, 로그인 상태를 한 번에 점검한다.
`opentree doctor --json`은 같은 진단 결과를 CI나 스크립트에서 읽기 쉬운 JSON으로 출력한다.
`opentree config show`는 현재 설정 파일 내용을 그대로 출력한다.
`opentree profile set`, `opentree site set`, `opentree meta set`, `opentree link add`, `opentree link update`, `opentree link move`, `opentree link remove`, `opentree theme set`은 설정 파일 수정을 CLI로 대체한다.
`opentree link list`는 현재 링크 순서와 1-based 인덱스를 보여준다.

`opentree deploy`를 쓰려면 먼저 Vercel CLI가 필요하다.
또한 `siteUrl`이 설정되어 있어야 하고, `vercel login`이 완료되어 있어야 한다.

```bash
npm install -g vercel
opentree site set --url "https://links.example.com"
vercel login
opentree deploy
```

### 로컬 개발 실행

```bash
node ./bin/opentree.js init
```

```bash
npm link
opentree init
```

## 1. 프로젝트 개요

### 1.1 프로젝트명

**opentree**

### 1.2 한 줄 정의

`opentree`는 고정된 UI를 기반으로, 선언형 설정과 CLI 명령을 통해 링크 프로필 페이지를 생성·수정·미리보기·배포할 수 있게 하는 오픈소스 프로젝트다.

### 1.3 목표

- Linktree의 핵심 기능 중 **링크 프로필 페이지 생성/관리/배포** 영역을 CLI 중심으로 재현한다.
- 개발자 친화적인 워크플로우를 제공한다.
- 자연어 입력을 구조화된 설정으로 변환하는 **LLM 친화 인터페이스**를 후속 기능으로 실험한다.
- Vercel 배포를 공식 Vercel CLI에 위임하는 방식으로 구현 복잡도를 낮춘다.

### 1.4 프로젝트 성격

- 비즈니스 목적이 아닌 **오픈소스 사이드 프로젝트**
- Linktree 전체를 완전히 대체하는 것이 아니라, 어디까지 대체 가능한지 실험하는 프로젝트
- UI 자유도를 우선하지 않고, **고정 UI + 좋은 DX**를 우선하는 프로젝트

---

## 2. 문제 정의

Linktree의 핵심 산출물은 결국 하나의 링크 허브 페이지다. 이 페이지는 대체로 다음 데이터로 표현할 수 있다.

- 프로필 이름
- 소개 문구
- 아바타 이미지
- 링크 리스트
- 링크 우선순위 및 노출 여부
- 간단한 테마 옵션

즉, 이 문제는 본질적으로 다음과 같이 환원된다.

> “구조화된 입력 데이터를 받아, 일관된 UI 규칙으로 하나의 웹 페이지를 생성하고 배포할 수 있는가?”

`opentree`는 이 질문에 대해 **예**라고 답하는 방향으로 설계한다.

---

## 3. Linktree 대비 대체 범위

### 3.1 대체 가능한 핵심 기능

초기 및 중기 범위에서 다음 기능은 충분히 재현 가능하다.

- 프로필 정보 관리
- 링크 추가 / 수정 / 삭제
- 링크 순서 변경
- 링크 타입 프리셋(예: GitHub, X, YouTube, Blog, Email)
- 고정 UI 렌더링
- 정적 페이지 생성
- 로컬 미리보기
- Vercel 배포
- 커스텀 도메인 연결 안내
- 기본 SEO 메타 태그
- QR 코드 생성(후속)
- 기초 클릭 추적(후속)

### 3.2 기술적으로 가능하지만 v1 범위를 넘는 기능

- 링크별 클릭 분석 대시보드
- 예약 게시
- 다국어 페이지
- 폼 수집
- 관리자 웹 UI
- 복수 템플릿
- 소셜 카드 고급 설정

### 3.3 현실적으로 실험 범위를 벗어나는 기능

- Linktree 수준의 수익화 기능
- 디지털 상품 판매 인프라
- 제휴 네트워크
- 완성형 모바일 노코드 편집 UX
- 대규모 생태계 연동

### 3.4 결론

`opentree`는 **“링크 인 바이오 페이지 생성기”**의 핵심 영역은 높은 수준으로 대체 가능하다. 반면 수익화·운영·생태계 영역은 본 프로젝트의 목표 밖으로 둔다.

---

## 4. 핵심 제품 철학

### 4.1 고정 UI 우선

첫 버전에서는 자유로운 UI 편집보다 **고정 UI의 안정성과 예측 가능성**을 우선한다.

이 선택의 장점:

- 구현 난이도 감소
- 입력 스키마 단순화
- 렌더링 품질 일관성 확보
- LLM 결과를 안정적으로 매핑 가능

### 4.2 선언형 설정 우선

모든 최종 상태는 설정 파일 하나로 표현 가능해야 한다.

예상 원칙:

- 수동 수정 가능
- Git 추적 가능
- CLI 명령으로 자동 수정 가능
- LLM이 생성해도 같은 구조를 사용

### 4.3 LLM은 렌더러가 아니라 변환기

LLM이 직접 HTML/CSS를 만드는 구조는 피한다.

좋은 구조:

1. 사용자가 자연어로 의도를 입력
2. LLM이 설정 스키마(JSON/YAML)로 변환
3. validator가 검증
4. 렌더러가 결정적으로 페이지 생성

이렇게 해야 결과의 일관성과 유지보수성이 높아진다.

### 4.4 배포는 감싸고 위임한다

Vercel 인증과 배포를 직접 구현하지 않고, **공식 Vercel CLI를 호출하는 래퍼**를 만든다.

---

## 5. 대상 사용자

### 5.1 1차 타깃

- 개발자
- 메이커
- CLI 사용 경험이 있는 사용자
- 개인 포트폴리오/프로필 페이지를 빠르게 만들고 싶은 사용자

### 5.2 비대상

- 완전 비개발자
- 시각 편집기 중심 사용자를 기대하는 사용자
- 드래그 앤 드롭 웹 빌더를 원하는 사용자

### 5.3 사용자 가치

- 구독료 없이 링크 페이지 생성 가능
- 설정 파일 기반으로 재현 가능
- Git과 함께 관리 가능
- Vercel로 빠른 배포 가능
- 추후 자연어 기반 편집 가능

---

## 6. 기능 범위 정의

## 6.1 MVP 범위

MVP는 아래만 포함한다.

- 프로젝트 초기화
- 프로필 설정 파일 생성
- 링크 추가 / 수정 / 삭제
- 링크 순서 지정
- 로컬 빌드
- 로컬 미리보기
- Vercel 배포
- 기본 메타 태그 생성
- 기본 에러 메시지

### 6.2 MVP 제외 범위

- 웹 대시보드
- 계정 시스템
- 자체 인증
- 링크 분석 저장소
- 다중 사용자 협업
- 복수 페이지 지원
- 복수 테마 지원
- 관리자 패널

### 6.3 v1 이후 고려 기능

- `prompt` 명령으로 자연어 입력 처리
- 링크 클릭 추적 리다이렉트 라우트
- QR 코드 생성
- preset theme 2~3개
- 텍스트/소개 문구 AI 보조

---

## 7. 시스템 개념도

```text
사용자
  ↓
opentree CLI
  ├─ 명령 파싱
  ├─ 설정 파일 읽기/쓰기
  ├─ 스키마 검증
  ├─ 페이지 렌더링
  ├─ 로컬 미리보기
  └─ Vercel CLI 호출
        ↓
     배포 결과
```

후속 LLM 버전:

```text
사용자 자연어 입력
  ↓
LLM 변환기
  ↓
opentree.config.json 생성/갱신
  ↓
validator
  ↓
renderer
  ↓
preview / deploy
```

---

## 8. 기술 스택 제안

## 8.1 언어 및 런타임

- **TypeScript**
- **Node.js**

선정 이유:

- 웹 프론트엔드 개발자에게 익숙함
- 파일 시스템 접근, child process 실행이 쉬움
- CLI 라이브러리 생태계가 좋음
- 추후 LLM 및 웹 템플릿 연동이 자연스러움

### 8.2 주요 라이브러리 후보

- CLI 파서: `commander` 또는 `cac`
- 스키마 검증: `zod`
- 외부 프로세스 실행: `execa`
- 개발 서버: `vite` 또는 단순 `http-server` 래핑
- 파일 처리: Node `fs/promises`
- 경로 처리: Node `path`
- 템플릿 렌더링: 단순 문자열 템플릿 또는 `ejs`
- 로그/컬러: `picocolors`
- 프롬프트 입력: `prompts` 또는 `enquirer`

### 8.3 패키징 방향

- npm 패키지로 배포
- 실행 예시:

```bash
npx opentree init
```

또는 글로벌 설치:

```bash
npm install -g opentree
opentree init
```

---

## 9. 디렉터리 구조 제안

```text
opentree/
  src/
    commands/
      init.ts
      add.ts
      update.ts
      remove.ts
      list.ts
      build.ts
      dev.ts
      deploy.ts
      doctor.ts
      prompt.ts        # 후속 기능
    core/
      config.ts
      schema.ts
      renderer.ts
      templates.ts
      links.ts
      meta.ts
      deploy.ts
      preview.ts
      logger.ts
      errors.ts
    templates/
      default/
        index.html
        styles.css
        assets/
    utils/
      file.ts
      path.ts
      process.ts
  examples/
    basic/
  tests/
    unit/
    integration/
  package.json
  tsconfig.json
  README.md
```

---

## 10. 설정 파일 설계

## 10.1 파일명 제안

`opentree.config.json`

후속으로 YAML 지원을 고려할 수 있지만, 처음에는 JSON 하나로 시작하는 편이 단순하다.

### 10.2 예시

```json
{
  "profile": {
    "title": "kidow",
    "bio": "Frontend Developer",
    "avatar": "./assets/avatar.png"
  },
  "seo": {
    "title": "kidow | opentree",
    "description": "Links and profile",
    "image": "./assets/og.png"
  },
  "theme": {
    "preset": "default"
  },
  "links": [
    {
      "id": "github",
      "type": "github",
      "label": "GitHub",
      "url": "https://github.com/kidow",
      "visible": true
    },
    {
      "id": "blog",
      "type": "custom",
      "label": "Blog",
      "url": "https://example.com",
      "visible": true
    }
  ]
}
```

### 10.3 스키마 원칙

- 사람이 읽기 쉬워야 함
- LLM이 생성하기 쉬워야 함
- 기본값이 명확해야 함
- 검증 실패 메시지가 쉬워야 함

### 10.4 Zod 스키마 초안

```ts
import { z } from "zod";

export const linkSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["custom", "github", "x", "youtube", "blog", "email"]),
  label: z.string().min(1),
  url: z.string().url(),
  visible: z.boolean().default(true),
});

export const configSchema = z.object({
  profile: z.object({
    title: z.string().min(1),
    bio: z.string().default(""),
    avatar: z.string().optional(),
  }),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
    })
    .optional(),
  theme: z
    .object({
      preset: z.string().default("default"),
    })
    .default({ preset: "default" }),
  links: z.array(linkSchema).default([]),
});
```

---

## 11. CLI 명령 설계

## 11.1 핵심 명령 목록

### `opentree init`

프로젝트 초기화

역할:

- `opentree.config.json` 생성
- 기본 템플릿 파일 생성
- assets 디렉터리 생성
- 필요한 안내 문구 출력

예시:

```bash
opentree init
```

옵션 예시:

```bash
opentree init --yes
opentree init --template default
```

### `opentree add`

링크 추가

예시:

```bash
opentree add github https://github.com/kidow
opentree add blog https://example.com --label "Tech Blog"
opentree add custom https://example.com/contact --label "Contact"
```

동작:

- type에 따른 기본 label 제안
- config 파일에 링크 항목 추가
- id 충돌 검사

### `opentree update`

기존 링크 수정

예시:

```bash
opentree update github --label "My GitHub"
opentree update blog --url https://blog.example.com
```

### `opentree remove`

링크 제거

예시:

```bash
opentree remove github
```

### `opentree list`

현재 링크 목록 확인

예시:

```bash
opentree list
```

### `opentree build`

정적 페이지 생성

예시:

```bash
opentree build
```

출력:

- `dist/index.html`
- `dist/styles.css`
- 필요한 assets 복사

### `opentree dev`

로컬 미리보기 서버 실행

예시:

```bash
opentree dev
```

동작:

- build 수행
- 파일 변경 감지
- 미리보기 서버 실행

### `opentree deploy`

Vercel 배포

예시:

```bash
opentree deploy
opentree deploy --prod
```

동작:

- `vercel` CLI 존재 여부 확인
- 없으면 설치 안내
- build 수행
- `vercel` 또는 `vercel --prod` 실행

### `opentree doctor`

환경 점검

예시:

```bash
opentree doctor
```

점검 대상:

- Node 버전
- config 파일 존재 여부
- `vercel` CLI 설치 여부
- 필수 필드 누락 여부

### `opentree prompt` (후속)

자연어 기반 설정 생성/수정

예시:

```bash
opentree prompt "개발자 포트폴리오용 링크 페이지를 만들어줘. GitHub, 블로그, 이메일을 넣어줘."
```

동작:

- 자연어를 구조화된 config patch로 변환
- 검증 후 사용자 승인
- config 반영

---

## 12. 내부 모듈 설계

### 12.1 `config.ts`

역할:

- 설정 파일 로드
- 설정 파일 저장
- 기본값 적용
- 검증 오류 처리

핵심 함수 예시:

- `loadConfig()`
- `saveConfig()`
- `createDefaultConfig()`
- `ensureConfigExists()`

### 12.2 `schema.ts`

역할:

- Zod 스키마 정의
- 파싱/검증
- 사용자 친화 오류 메시지 변환

### 12.3 `links.ts`

역할:

- 링크 타입 프리셋 관리
- 기본 label 생성
- id 생성 규칙

예시 프리셋:

- github
- x
- youtube
- blog
- email
- custom

### 12.4 `renderer.ts`

역할:

- config를 받아 HTML 생성
- theme preset 반영
- meta tag 삽입
- 링크 리스트 렌더링

중요 원칙:

- 결과는 deterministic해야 함
- LLM에 의존하지 않아야 함

### 12.5 `deploy.ts`

역할:

- build 전처리
- `vercel` 존재 확인
- child process로 배포 명령 실행

### 12.6 `preview.ts`

역할:

- dist 디렉터리 서빙
- watch 모드 제공

---

## 13. 렌더링 전략

## 13.1 첫 버전 선택

첫 버전은 **정적 HTML + CSS 생성**이 가장 적절하다.

이유:

- 단순함
- 빠른 빌드
- 배포 용이
- 러닝커브 낮음
- 프레임워크 종속성 최소화

### 13.2 대안

후속으로 아래 대안을 고려할 수 있다.

- Vite 기반 정적 사이트 생성
- Next.js 기반 export
- React 기반 템플릿 시스템

그러나 v1은 이 방향이 과할 수 있다.

### 13.3 권장 방침

v1:

- 순수 HTML/CSS 템플릿

v2 이후:

- 필요 시 React 템플릿 엔진 도입

---

## 14. Vercel 연동 전략

## 14.1 기본 방침

`opentree`는 Vercel API를 직접 구현하지 않고, **공식 Vercel CLI를 래핑**한다.

### 14.2 예상 흐름

1. `opentree deploy` 실행
2. `vercel` 명령 사용 가능 여부 확인
3. 없으면 설치 안내
4. `opentree build` 수행
5. `dist` 기준으로 `vercel` 배포 실행
6. 결과 URL 출력

### 14.3 구현 예시 개념

```ts
import { execa } from "execa";

await execa("vercel", ["--prod"], {
  stdio: "inherit",
});
```

### 14.4 장점

- 인증 구현 부담 감소
- Vercel 쪽 로그인 흐름 변경에 덜 민감
- 구현 속도 향상

### 14.5 주의점

- 사용자 환경에 `vercel` CLI가 설치되어 있어야 함
- Vercel 로그인 상태에 의존함
- CI/CD 통합은 후속 범위

---

## 15. LLM 친화 인터페이스 설계

## 15.1 핵심 가설

CLI가 비개발자에게는 불편할 수 있으나, 자연어 인터페이스를 도입하면 **설정 파일을 직접 몰라도 페이지를 구성할 수 있는 UX**를 제공할 수 있다.

### 15.2 역할 정의

LLM이 맡을 역할:

- 자연어를 구조화된 설정으로 변환
- 소개 문구 초안 작성
- 링크 우선순위 제안
- label 자동 생성
- config patch 생성

LLM이 맡지 않을 역할:

- 직접 HTML/CSS 생성
- 템플릿 구조 변경
- 무제한 자유형 레이아웃 설계

### 15.3 안전한 구조

```text
user prompt
  ↓
LLM
  ↓
JSON patch
  ↓
zod validation
  ↓
user confirmation
  ↓
config save
```

### 15.4 예시

입력:

> 개발자 포트폴리오용 링크 페이지를 만들어줘. GitHub, 블로그, 이메일을 넣고 소개는 짧게 해줘.

예상 출력:

```json
{
  "profile": {
    "title": "Your Name",
    "bio": "Frontend developer building products and experiments."
  },
  "links": [
    {
      "id": "github",
      "type": "github",
      "label": "GitHub",
      "url": "https://github.com/yourname",
      "visible": true
    },
    {
      "id": "blog",
      "type": "blog",
      "label": "Blog",
      "url": "https://yourblog.com",
      "visible": true
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email",
      "url": "mailto:you@example.com",
      "visible": true
    }
  ]
}
```

---

## 16. UX 원칙

### 16.1 설치 후 첫 경험이 중요

사용자는 아래 경험을 5분 안에 얻어야 한다.

1. `opentree init`
2. 링크 추가
3. `opentree dev`
4. `opentree deploy`

이 흐름이 매끄러우면 프로젝트의 핵심 가치는 증명된다.

### 16.2 에러 메시지는 설명형으로

나쁜 예:

- invalid config
- command failed

좋은 예:

- `opentree.config.json` 파일이 없습니다. 먼저 `opentree init`을 실행하세요.
- `vercel` CLI를 찾을 수 없습니다. `npm i -g vercel` 또는 `npx vercel` 사용 가능 여부를 확인하세요.
- `links[1].url` 값이 올바른 URL 형식이 아닙니다.

### 16.3 출력은 과하지 않게

- 성공 메시지
- 다음 단계 안내
- 오류 시 원인과 해결 힌트

---

## 17. 구현 단계 제안

## 17.1 Phase 0 — 설계 고정

목표:

- 프로젝트 목표 문서화
- config 스키마 확정
- 기본 UI 목업 확정
- CLI 명령 목록 확정

산출물:

- 본 문서
- config 예시
- 기본 템플릿 스케치

### 17.2 Phase 1 — CLI 뼈대

목표:

- TypeScript CLI 프로젝트 초기화
- 명령 등록 구조 작성
- 공통 로거/에러 처리 준비

산출물:

- `opentree init`
- `opentree doctor`
- 기본 프로젝트 구조

### 17.3 Phase 2 — 설정 파일 및 링크 관리

목표:

- config 읽기/쓰기 구현
- add/update/remove/list 구현
- Zod 검증 구현

산출물:

- 설정 파일 관리 기능 완성
- 링크 조작 기능 완성

### 17.4 Phase 3 — 렌더러 구현

목표:

- HTML/CSS 템플릿 구현
- build 결과 생성
- assets 복사
- SEO meta 반영

산출물:

- `opentree build`
- `dist/` 산출물

### 17.5 Phase 4 — 로컬 개발 경험

목표:

- watch 모드
- 로컬 서버
- build와 preview 연결

산출물:

- `opentree dev`

### 17.6 Phase 5 — 배포 연동

목표:

- `vercel` CLI 존재 여부 확인
- 배포 실행
- 에러 처리

산출물:

- `opentree deploy`

### 17.7 Phase 6 — 품질 보강

목표:

- 단위 테스트
- 통합 테스트
- example 프로젝트
- README 정리

산출물:

- 오픈소스 공개 가능한 최소 품질 확보

### 17.8 Phase 7 — LLM 인터페이스 실험

목표:

- `prompt` 명령 실험 구현
- 자연어 → config patch 흐름 검증
- 안전장치/검증 흐름 설계

산출물:

- 실험적 AI 편집 기능

---

## 18. 테스트 전략

### 18.1 단위 테스트 대상

- config 파싱
- schema validation
- 링크 추가/수정/삭제
- label preset 로직
- renderer 출력 핵심 함수

### 18.2 통합 테스트 대상

- `init` → `add` → `build` 흐름
- 잘못된 config 에러 처리
- `deploy` 사전 검사

### 18.3 수동 테스트 시나리오

- 빈 프로젝트 초기화
- GitHub/Blog/Email 링크 추가
- 로컬 미리보기 확인
- 실제 Vercel 배포 확인
- avatar/SEO 메타 적용 확인

---

## 19. 오픈소스 운영 준비

### 19.1 필수 문서

- `README.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `CHANGELOG.md` (선택)

### 19.2 README에 포함할 내용

- 프로젝트 소개
- 왜 만들었는지
- 설치 방법
- 빠른 시작
- config 예시
- 명령어 목록
- 로드맵

### 19.3 라이선스 후보

- MIT
- Apache-2.0

사이드 프로젝트라면 MIT가 가장 단순하다.

---

## 20. Codex 작업 지시 단위 제안

Codex에 한 번에 전부 맡기기보다, 아래처럼 작은 작업 단위로 나누는 것이 좋다.

### 작업 1

**TypeScript 기반 Node CLI 프로젝트를 초기화하고, `opentree`라는 실행 명령 이름을 갖는 최소 CLI 골격을 만든다. `commander`, `zod`, `execa`, `picocolors`를 설치하고 기본 엔트리포인트와 명령 등록 구조를 작성한다.**

### 작업 2

**`opentree.config.json` 스키마를 정의하고, 설정 파일을 읽고 검증하고 저장하는 유틸리티를 구현한다. 파일이 없을 때와 잘못된 형식일 때 친절한 오류 메시지를 출력하도록 한다.**

### 작업 3

**`opentree init` 명령을 구현한다. 기본 config 파일, assets 디렉터리, 샘플 템플릿 파일을 생성하고 성공 메시지를 출력한다.**

### 작업 4

**`opentree add`, `update`, `remove`, `list` 명령을 구현한다. 링크 타입 프리셋을 지원하고 config 파일이 변경되도록 한다.**

### 작업 5

**config를 기반으로 `dist/index.html`과 `dist/styles.css`를 생성하는 정적 렌더러를 구현한다. 기본 메타 태그와 링크 리스트 렌더링을 포함한다.**

### 작업 6

**`opentree build`와 `opentree dev` 명령을 구현한다. build는 정적 결과물을 만들고, dev는 watch + preview 서버를 제공하도록 한다.**

### 작업 7

**`opentree deploy` 명령을 구현한다. `vercel` CLI 존재 여부를 점검하고, build 후 배포를 실행하며 실패 원인을 친절하게 안내한다.**

### 작업 8

**핵심 기능에 대한 단위 테스트와 통합 테스트를 추가하고, README에 quick start와 명령어 예시를 정리한다.**

### 작업 9

**실험적 `opentree prompt` 명령 초안을 만든다. 자연어 입력을 임시 mock 변환기 또는 LLM adapter를 통해 config patch로 변환하고 검증 후 반영하는 구조만 우선 구현한다.**

---

## 21. 예상 리스크와 대응

### 리스크 1. 범위가 커질 수 있음

원인:

- Linktree의 확장 기능까지 욕심낼 수 있음

대응:

- MVP를 엄격히 고정
- 첫 공개 전에는 단일 고정 UI만 유지

### 리스크 2. CLI 초보자로서 구현 난이도 부담

원인:

- 파일 처리, child process, watcher, 패키징 모두 처음일 수 있음

대응:

- build보다 먼저 config 조작 CLI를 완성
- 각 명령을 작은 단위로 구현
- Codex에 기능을 잘게 쪼개서 요청

### 리스크 3. LLM 기능이 너무 빨리 복잡해짐

원인:

- 자연어 해석은 표면상 쉬워 보여도 구조화와 안전성이 필요함

대응:

- LLM 기능은 반드시 후순위
- 먼저 deterministic CLI를 완성

### 리스크 4. Vercel 환경 차이

원인:

- 사용자의 로컬 환경마다 `vercel` 설치/로그인 상태가 다름

대응:

- `doctor` 명령 제공
- `deploy` 전에 사전 점검 수행

---

## 22. 최종 권장 구현 순서

가장 권장되는 실제 구현 순서는 아래와 같다.

1. 프로젝트 초기화
2. config 스키마 작성
3. `init` 구현
4. `add/update/remove/list` 구현
5. `build` 구현
6. `dev` 구현
7. `deploy` 구현
8. README 작성
9. 테스트 보강
10. `prompt` 실험 기능 추가

이 순서를 지키면, 복잡도가 급격히 증가하는 구간을 늦출 수 있다.

---

## 23. 프로젝트의 성공 기준

`opentree`의 성공은 사업적 성공이 아니라, 아래 질문에 **실제로 작동하는 코드로 답하는 것**이다.

- CLI만으로 링크 페이지를 만들 수 있는가?
- 설정 파일만으로 일관된 페이지를 생성할 수 있는가?
- Vercel 배포까지 자연스럽게 이어지는가?
- Linktree의 핵심 기능 일부를 꽤 높은 품질로 재현할 수 있는가?
- 자연어 입력을 붙였을 때 CLI의 진입 장벽을 낮출 수 있는가?

이 질문들에 대해 동작하는 프로토타입을 만들 수 있다면, `opentree`는 충분히 의미 있는 오픈소스 실험 프로젝트가 된다.

---

## 24. 요약

`opentree`는 고정 UI를 전제로, 선언형 설정과 CLI 명령을 통해 링크 프로필 페이지를 만들고 배포하는 오픈소스 프로젝트다. 이 프로젝트는 Linktree 전체를 대체하려는 것이 아니라, 그 핵심 기능 중 어디까지를 개발자 친화적 방식으로 재현할 수 있는지를 검증하는 실험이다. 첫 버전에서는 정적 HTML 생성, 링크 관리, 로컬 미리보기, Vercel CLI 기반 배포까지를 MVP로 삼는 것이 적절하다. 이후 자연어 입력을 구조화된 설정으로 변환하는 LLM 인터페이스를 붙이면, 단순 CLI를 넘어선 `LLM-native profile page builder` 실험으로 확장할 수 있다.
