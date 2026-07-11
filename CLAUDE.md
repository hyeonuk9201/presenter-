# TC-Presenter 프로젝트

## 세션 시작 순서 (필수)
1. docs/TODO.md
2. docs/CurrentState.md — 맨 아래 번호 큰 것부터
3. 작업 관련 아키텍처 문서 (docs/Decisions.md 등)

## 스택
- 단일 HTML 파일 구조 (index.html), ES Modules
- 저장소: localStorage (StorageAdapter.js 경유 필수)
- 상태: AppStore.js (CustomEvent 기반), CommandBus.js 경유
- 개발 환경: WSL (Ubuntu), VS Code 내장 터미널

## 아키텍처 원칙
- 모든 상태 변경은 CommandBus.execute() 경유 (직접 수정 금지)
- 새 결정은 docs/Decisions.md에 D-NNN 번호로 기록
- 결정 전 기존 D-NNN과 충돌 여부 먼저 확인
- 도메인 파일은 DOM/Store/렌더링을 알지 못한다
- SongStore ↔ MediaStore 서로 모른다 (D-027)

## 검증
- 새 JS 파일: `node --check`로 구문 검사
- index.html script 블록: python3로 추출 후 `node --check`
- HTML 구조: 중복 id 없음, div 개폐 개수 일치 확인
- 브라우저 테스트: Playwright로 실제 동작 확인

## 금지 패턴
- alert() / confirm() / prompt() → 토스트 또는 인라인 확인(is-confirming)
- localStorage 직접 접근 → StorageAdapter.js 경유
- CommandBus 없이 Presentation 상태 직접 수정
