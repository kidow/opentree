# Opentree Linktree Replacement TODO

기준 문서:
- Linktree 기능 원본 조사: `docs/deep-research-report.md`
- opentree 구현 근거: `README.md`, `opentree.schema.json`, `src/build.js`, `src/edit.js`, `src/import.js`, `src/catalog.js`, `apps/docs/content/docs/**/*`

판정 기준:
- `[x]` 현재 저장소 기준으로 opentree에서 이미 구현된 기능
- `[ ]` 아직 구현되지 않았거나, opentree 바깥 운영 수단으로만 가능한 기능
- `Partial` 표기는 일부 기반은 있으나 Linktree 수준 대체는 아닌 경우

## 현재 구현 범위 요약

- [x] 정적 링크 인 바이오 페이지 생성
- [x] 프로필 이름, 바이오, 아바타 관리
- [x] 링크 추가, 수정, 삭제, 순서 변경
- [x] 색상 테마 조정
- [x] `glass` / `terminal` 템플릿
- [x] 메타데이터, OG 이미지, favicon 생성
- [x] `siteUrl` 기반 canonical, `robots.txt`, `sitemap.xml` 생성
- [x] QR 코드 블록 표시
- [x] 로컬 클릭 추적
- [x] CLI 기반 초기화, interactive setup, import, prompt 편집
- [x] 로컬 프리뷰와 Vercel 배포 연동

## Priority 0

핵심 Link-in-bio 대체에 직접 연결되는 항목입니다.

- [x] 기본 프로필 페이지 생성
- [x] 프로필 이름, 바이오, 아바타 표시
- [x] 링크 CRUD
- [x] 링크 순서 변경
- [x] 기본 테마 색상 변경
- [x] 기본 메타데이터 설정
- [x] 기본 OG 이미지 제공
- [x] favicon 생성
- [x] canonical, robots, sitemap 생성
- [x] QR 코드 노출
- [x] 로컬 프리뷰
- [x] 배포 워크플로우
- [ ] 링크 숨김 또는 비활성 토글
- [ ] 링크 스케줄링
- [ ] 링크별 redirect/temporary redirect
- [ ] 링크별 featured layout
- [ ] 우선 노출 링크 지정
- [ ] 링크 썸네일 또는 아이콘
- [ ] 컬렉션/섹션/폴더 구성
- [ ] 컬렉션 단위 공유
- [ ] 헤더 블록
- [ ] 텍스트 블록
- [ ] PDF 표시
- [ ] RSS 피드 링크

## Priority 1

핵심 대체 이후 완성도를 높이는 항목입니다.

- [ ] Partial: 디자인 시스템 확장
현재는 템플릿 2종과 색상 3종만 있고, 배경 이미지/비디오, 프로필 레이아웃 변화, 시각 에디터는 없습니다.

- [ ] Partial: 분석 기능 확장
현재는 `analytics.clickTracking = "local"` 기반 로컬 클릭 저장만 있고, Insights UI, 기간별 집계, 링크별 리포트, CSV 내보내기는 없습니다.

- [ ] 외부 분석 연동
Google Analytics, Meta Pixel, UTM 자동 부착

- [ ] 공유 자산 확장
QR 다운로드 파일 생성, QR 커스터마이즈, 짧은 공유 링크

- [ ] 연락 수단 링크 확장
이메일, 전화, SMS, 소셜 아이콘 전용 필드

- [ ] richer preset or app system
현재 preset은 `github`, `linkedin`, `x`, `youtube`뿐이며 Link Apps 수준의 임베드는 없습니다.

- [ ] 템플릿 커스터마이즈 확장
버튼 모양, 폰트, 배경, 프로필 헤더 레이아웃, footer branding 제어

- [ ] 링크별 부가 메타데이터
설명, 배지, 카테고리, 태그, 썸네일 alt, 새 창 여부 제어

## Priority 2

SaaS형 제품으로 확장할 때 필요한 항목입니다. 현재 opentree의 CLI-first 정적 사이트 범위를 넘어섭니다.

- [ ] Contact form
- [ ] Subscribe and subscriber-only content
- [ ] Audience integrations
- [ ] 예약 임베드 및 native booking flow
- [ ] Shop, digital products, courses, bookings monetization
- [ ] Sponsored links, rewards
- [ ] Discount code blocks
- [ ] Link lock, age lock, code lock
- [ ] Sensitive content labeling
- [ ] Unsafe URL 판정 및 신고 플로우
- [ ] 멀티 프로필 관리
- [ ] 멀티 관리자 초대
- [ ] 모바일 앱
- [ ] Social planner
- [ ] Instagram auto-reply
- [ ] AI post ideas / hashtag tools

## Full Parity Checklist

### 링크 관리

- [x] 링크 생성
- [x] 링크 정렬
- [ ] 링크 숨김/비활성
- [ ] 링크 스케줄링
- [ ] 리다이렉트 링크
- [ ] Featured 레이아웃
- [ ] Prioritize 링크
- [ ] 링크 썸네일/아이콘
- [ ] 컬렉션
- [ ] 공유 가능한 컬렉션
- [ ] 헤더
- [ ] 텍스트 블록
- [ ] PDF 표시
- [ ] RSS 피드 링크

### 디자인 및 테마

- [x] 기본 테마 선택
`glass` / `terminal`

- [x] 커스텀 색상 테마
accent, background, text color

- [x] 프로필 이미지
단일 avatar URL 기반

- [x] 타이틀 변경
- [x] 바이오 변경
- [ ] 커스텀 배경 이미지/비디오
- [ ] 자동 디자인 개선 기능
- [ ] Linktree 로고 숨김과 유사한 footer branding 옵션
- [ ] 프로필 헤더 레이아웃 다양화

### 분석 및 통계

- [ ] Partial: 인사이트 개요
로컬 클릭 추적은 있지만 중앙 저장소, 방문 수, CTR, subscriber 분석은 없습니다.

- [ ] 방문자 분석
- [ ] 개별 링크 인사이트 UI
- [ ] QR 스캔 추적
- [ ] CSV 내보내기

### 통합 및 연동

- [ ] Link Apps
- [ ] Instagram 프로필/포스트 표시
- [ ] Instagram Grid
- [ ] RSS 피드 자동 표시
- [ ] Calendly embed
- [ ] Typeform embed
- [ ] Tours and Events
- [ ] Web3/NFT 링크 타입
- [ ] 일반 embed framework

### 리드 수집 및 CRM

- [ ] Contact Form
- [ ] Contact Details vCard
- [ ] Subscribe
- [ ] Audience 외부 연동
- [ ] 이메일/전화 direct link 전용 UX

### 수익화 및 상업 기능

- [ ] Shop
- [ ] Shop posts
- [ ] Sponsored links
- [ ] Rewards
- [ ] Digital products
- [ ] Courses
- [ ] Bookings
- [ ] Discount code
- [ ] SendOwl 연동

### SEO 및 메타데이터

- [x] 메타 title/description
- [x] OG image URL 또는 generated social card
- [x] canonical URL
- [x] `robots.txt`
- [x] `sitemap.xml`
- [ ] UTM 파라미터 자동 설정

### 보안 및 접근 제어

- [ ] MFA
- [ ] 코드 락
- [ ] 나이 락
- [ ] Subscribe 락
- [ ] 민감 콘텐츠 경고
- [ ] Unsafe URL 검출/차단
- [ ] 위반 신고 플로우

### 공유, 배포, 도메인

- [x] 공개 URL을 가진 링크 페이지 배포
- [x] QR 코드 노출
- [ ] QR 다운로드 자산 생성
- [ ] QR 커스터마이즈
- [ ] 짧은 공유 링크
- [ ] CLI에서의 custom domain 관리

주의:
`opentree`는 self-hosting 또는 Vercel 배포를 전제로 하므로 실제 custom domain 사용 자체는 운영 환경에서 가능할 수 있습니다. 다만 현재 CLI가 도메인 연결을 관리하지는 않으므로 체크하지 않았습니다.

### 모바일 앱 및 운영 확장

- [ ] 모바일 앱
- [ ] iOS share sheet 기반 빠른 추가
- [ ] 다중 프로필
- [ ] 멀티 관리자
- [ ] 다국어 관리 UI

### 소셜 운영 및 마케팅

- [ ] Social planner
- [ ] Instagram auto-reply
- [ ] AI post ideas
- [ ] Hashtag generator
- [ ] Meta Pixel 연동
- [ ] Google Analytics 연동

### 캠페인성 배너

- [ ] Support banner

## Suggested Build Order

- [ ] 1. 링크 숨김/비활성, 썸네일, 헤더/텍스트 블록 추가
- [ ] 2. 컬렉션 또는 섹션 구조 추가
- [ ] 3. 스케줄링과 redirect 추가
- [ ] 4. 인사이트 저장 방식 정비
로컬 스토리지 기반을 넘어서 파일, API, 또는 외부 분석 연동 중 하나를 선택

- [ ] 5. 외부 분석 연동
Google Analytics, Meta Pixel, UTM

- [ ] 6. QR 자산 생성과 공유 링크 개선
- [ ] 7. Contact form / subscribe 등 리드 수집 기능 검토
- [ ] 8. 이후 monetization, marketing, multi-admin 같은 SaaS 범위 확장 여부 결정

## Notes

- 현재 opentree는 Linktree의 "호스팅형 운영 제품" 전체를 대체하기보다는, "정적 링크 인 바이오 페이지 생성과 배포"를 CLI 중심으로 대체하는 수준입니다.
- 따라서 Priority 0과 1까지만 완료해도 대부분의 개인/크리에이터용 핵심 사용 사례는 상당 부분 대체할 수 있습니다.
- 반대로 Audience, Earn, Social Planner, Admin collaboration은 별도 서비스 아키텍처가 필요하므로 단순 CLI 기능 추가만으로는 대체가 어렵습니다.
