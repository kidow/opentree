# opentree Rust Core + Tauri + Web 전환 계획

상태: 기획 완료. 구현 시작 안 함.

## 목표

`opentree`를 CLI 중심 도구에서 Rust core와 Tauri 데스크탑 앱 중심 제품으로 전환한다.

- Rust core: 제품 로직의 기준점
- Tauri 데스크탑 앱: 주력 GUI 제품 (macOS MVP)
- CLI: 과도기 호환용 legacy surface → 점진적 제거
- 웹 랜딩/문서 사이트: 다운로드, 온보딩, 릴리스 노트, 가이드 제공용

기존 Node.js CLI는 Rust 구현이 안정될 때까지 동작 기준점으로 유지한다. Rust/Tauri 완성 후 JS 코드 전체 제거.

## 결정된 사항

| 항목 | 결정 |
|------|------|
| 미언급 8개 모듈 (catalog, completion, dev, diagnostics, doctor, introspect, preflight, show) | 전부 폐기 |
| analytics.clickTracking | 제거 (MVP 이후 서버 기반으로 재설계) |
| links[] → blocks[] migration | 불필요 (기존 사용자 없음). blocks[]만 구현 |
| template/preset | 제거. 단일 고정 스타일 (흰 배경, 단순 버튼, 모바일 중앙 정렬) |
| block id | UUID v4 (`uuid` crate) |
| config 파일 위치 | 첫 실행 시 폴더 선택 다이얼로그. 선택 경로 앱 설정에 저장 |
| 저장 방식 | 명시적 저장 (Cmd+S + Save 버튼). dirty state 표시. 닫기 시 경고 |
| MVP nav | Links 하나만 |
| 추가 가능 block | link, heading, text. profile은 자동 생성/최상단 고정. footer MVP 제외 |
| Export 출력 | index.html + favicon.svg |
| 타겟 플랫폼 | macOS only (MVP) |
| HTML 렌더링 | `maud` crate |
| UI 스택 | React + TypeScript + Vite |
| DnD | @dnd-kit/core |

## 목표 구조

```text
opentree/
  Cargo.toml
  crates/
    opentree-core/
  apps/
    desktop/
    docs/
    legacy-cli/
  fixtures/
    configs/
    outputs/
  package.json
```

초기 구현에서 모든 파일을 즉시 이동하지는 않는다. 구조 변경은 Rust core와 Tauri MVP 경계가 안정된 뒤 단계적으로 진행한다.

## Config 모델

`opentree.config.json`은 공개 계약으로 유지한다.

- 기존 `links[]`, `template`, `analytics` 필드 제거
- `blocks[]` 중심 모델로 전환
- breaking change는 `schemaVersion` 증가와 migration 함수로 처리
- Rust core가 저장 전 항상 config를 검증한다

### Blocks

- `blocks[]` 배열 순서가 표시 순서다
- 각 block은 stable UUID v4 `id`, `type`, `enabled`를 가진다
- `enabled: false`는 dashboard에는 보이지만 published page에는 숨긴다
- MVP에서 삭제는 실제 제거로 처리한다

MVP block 타입:

- `profile` — 자동 생성, 최상단 고정, 추가/삭제 불가, 편집만 가능
- `link` — 사용자 추가 가능
- `heading` — 사용자 추가 가능
- `text` — 사용자 추가 가능

MVP 제외 block 타입 (후속):

- `footer`
- `collection`
- `socials`
- `image`
- `video` / `embed`
- `shop` / `product`
- `newsletter`
- `calendar` / `booking`

### Theme

단일 고정 스타일. 색상 3개만 편집 가능:

- `accentColor`
- `backgroundColor`
- `textColor`

preset 개념 없음. template 필드 제거.

### 기본 Config

```json
{
  "schemaVersion": 2,
  "profile": { "name": "", "bio": "", "avatarUrl": "" },
  "blocks": [
    { "id": "<uuid>", "type": "profile", "enabled": true },
    { "id": "<uuid>", "type": "link", "enabled": true, "title": "My Link", "url": "https://example.com" }
  ],
  "theme": {
    "accentColor": "#000000",
    "backgroundColor": "#ffffff",
    "textColor": "#000000"
  }
}
```

## 데스크탑 앱 MVP 범위

### 레이아웃

- 왼쪽 navigation: **Links만** (Design, Settings, Publish MVP 제외)
- 가운데: block editor
- 오른쪽: phone preview

### 기능

- 첫 실행 시 프로젝트 폴더 선택 다이얼로그
- profile block 편집 (이름, bio, 아바타)
- link / heading / text block 추가/편집/삭제
- block drag-and-drop 순서 변경 (`@dnd-kit/core`)
- block enabled toggle
- 명시적 저장 (Cmd+S, Save 버튼, dirty state, 닫기 경고)
- validation feedback
- Export — 폴더 선택 후 `index.html` + `favicon.svg` 생성

### MVP 제외

- Design 탭 (색상 편집)
- Settings 탭
- deploy / publish / domain 관리
- undo/redo
- archive
- analytics / insights
- Windows / Linux 빌드

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Rust core | `opentree-core` crate |
| HTML 렌더링 | `maud` crate |
| block id | `uuid` crate (v4) |
| config 직렬화 | `serde` + `serde_json` |
| Tauri | Tauri v2 |
| UI | React + TypeScript + Vite |
| DnD | @dnd-kit/core |
| 플랫폼 | macOS (MVP) |

## 단계별 계획

### 0단계: JS CLI 모듈 정리

산출물:

- 유지할 모듈 확정: build, config, validate, schema, init, edit, import, prompt, deploy, vercel
- 폐기 모듈 표시: catalog, completion, dev, diagnostics, doctor, introspect, preflight, show
- legacy로 남길 CLI 계약 문서화

종료 기준:

- 폐기 모듈이 명확히 분리됨
- Rust core 1차 구현 범위 확정

### 1단계: Rust Core 1차 구현

산출물:

- `crates/opentree-core` 생성
- config parse/write (`serde_json`)
- config validation
- 기본 config 생성 (schemaVersion 2, blocks[] 모델)
- `blocks[]` 모델 구현 (UUID v4 id)
- HTML 렌더링 (`maud`)
- `index.html`, `favicon.svg` 빌드 출력
- output path safety 구현

종료 기준:

- Rust core가 같은 config에서 정적 사이트 생성
- Rust core 함수가 CLI 파싱 없이 호출 가능

### 2단계: Legacy CLI 정리

산출물:

- 기존 Node.js CLI 동작 고정
- `--json`, `--dry-run` 동작 유지
- legacy CLI를 `apps/legacy-cli`로 이동

종료 기준:

- JS CLI가 과도기 기준점 역할 수행
- Rust core 전환 중 회귀 확인 가능

### 3단계: Tauri 데스크탑 MVP

산출물:

- `apps/desktop` 생성 (React + TypeScript + Vite)
- 첫 실행 폴더 선택 다이얼로그
- Links nav + block editor + phone preview 레이아웃
- profile / link / heading / text block 편집
- drag-and-drop block reorder (`@dnd-kit/core`)
- block enabled toggle
- 명시적 저장 + dirty state
- validation feedback
- Export (index.html + favicon.svg)
- macOS 패키징

종료 기준:

- 사용자가 터미널 없이 profile page를 만들고 편집 가능
- 데스크탑 앱이 Rust core로 config를 검증하고 저장
- phone preview가 편집 상태를 실시간 반영
- build/export가 Rust core를 통해 동작

### 4단계: 편집 경험 완성도

산출물:

- Design 탭 (색상 3개 편집)
- Settings 탭
- undo/redo
- archive
- import 흐름
- preview interaction 개선
- 에러 처리, 업데이트 전략

종료 기준:

- 편집, 저장, 검증, 빌드, 내보내기가 안정적으로 동작
- 복구 가능한 편집 실수 UX 존재

### 5단계: Publish와 Hosting

산출물:

- Vercel publish
- Cloudflare Pages publish
- GitHub Pages publish
- provider auth/token 저장
- deploy 로그와 실패 처리
- 도메인 추가/변경/제거
- Analytics / Insights (서버 기반 재설계)

종료 기준:

- 데스크탑 앱에서 publish 실행 및 상태 확인 가능
- 도메인 바인딩이 앱 안에서 처리됨

### 6단계: 웹 랜딩과 문서

산출물 (`apps/docs` 기존 Next.js 앱 완성):

- 랜딩 페이지
- 다운로드 페이지
- 시작 가이드
- 릴리스 노트 / changelog

종료 기준:

- 신규 사용자가 opentree가 무엇인지 이해 가능
- 설치 경로를 빠르게 찾을 수 있음

## 원칙

- Rust core 우선, UI는 그 다음
- 데스크탑 앱을 주력 제품으로 둠
- 기존 JS CLI는 legacy 기준점으로 임시 유지 후 제거
- 표면별 비즈니스 규칙 중복 금지
- 파일 포맷과 JSON 계약 안정 유지
- 데스크탑 앱은 CLI 파싱에 의존하지 않음
- 웹 사이트는 제품 로직을 가지지 않음
- MVP 범위 밖은 후속 단계로 엄격히 분리

## 리스크

- JS build와 Rust build 사이 출력 차이 발생
- Tauri macOS 패키징 복잡도
- publish/domain 흐름이 너무 일찍 UI에 얹히는 문제

## 변경 이력

- 2026-05-09: grill-me 세션으로 결정 사항 구체화. preset 제거, footer MVP 제외, analytics 제거, links[] 제거, macOS only, maud/dnd-kit 확정
- 2026-05-09: Rust core 우선, block model, Tauri dashboard MVP 범위로 계획 구체화
- 2026-05-07: 최초 전환 계획 작성
