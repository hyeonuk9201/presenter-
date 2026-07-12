# TC-Presenter 프로젝트

## 세션 시작 순서 (필수)
1. docs/TODO.md — 우선순위 로드맵 확인. P0/P1부터, ⚠ 항목은 착수 금지(아래 에스컬레이션 참조).
2. docs/CurrentState.md — 맨 아래(번호 큰 세션)부터 읽는다. "다음 단계 진입 시 주의사항" 절은 반드시 읽는다.
3. 착수 전 docs/Decisions.md에서 관련 D-NNN을 검색한다(D-029 강제 규칙). 관련 결정이 있으면 그 경계 안에서만 작업하고, 충돌하면 구현하지 말고 에스컬레이션한다.
4. 건드리는 레이어의 docs/*Architecture.md를 읽는다. 주의: Architecture 문서 상당수는 Phase 2 목표 구조(Element 모델, Session 등)를 서술한다 — 현재 코드와 다르면 docs/CurrentState.md가 최종 근거다(DocumentationHierarchy.md Tier 1 주의).

## 개발 환경 (함정 주의)
- WSL에는 node가 없다. node v24는 Windows 쪽에 있다.
- 테스트는 반드시 `node --test`를 직접 실행한다. `npm test`는 UNC 경로(\\wsl.localhost\...)에서 C:\Windows로 폴백해 엉뚱한 파일을 스캔하므로 사용 금지.
- Playwright Chromium은 Windows 쪽에 설치돼 있다.

## 스택
- 단일 HTML(index.html/output.html) + ES Modules, 빌드 없음
- 저장소: Presentation/Song/AppSettings는 localStorage(persistence/StorageAdapter.js 경유), Media는 IndexedDB(media/MediaStore.js)
- 상태: store/AppStore.js — Presentation/PresenterState 소유

## 아키텍처 원칙
- Presentation/PresenterState 상태 변경만 CommandBus.execute() 경유. 직접 dispatch() 호출 금지.
- SongStore/AppSettingsStore/MediaStore는 CommandBus/HistoryManager를 거치지 않는다(D-027). 이 저장소들에 Undo를 붙이라는 요구가 나오면 구현하지 말고 에스컬레이션한다(D-027 충돌).
- 도메인 파일(domain/*)은 DOM/Store/렌더링을 알지 못한다.
- 새 설계 결정은 docs/Decisions.md에 D-NNN으로 기록한 뒤 구현한다.

## 검증 (D-028)
- domain/store/persistence/command/history 변경 시: 같은 폴더에 *.test.js를 추가/갱신하고 `node --test` 전체 통과(현재 100건)를 확인한다. 테스트 없는 기능/버그 수정은 미완료다.
- ui/*.js, index.html/output.html embedded script 변경 시: Playwright 임시 E2E 스크립트로 검증 → 스크립트 삭제 → docs/ManualTestChecklist.md에 결과 한 줄 기록.

## 문서 갱신 형식
- docs/TODO.md: 새 항목은 7필드(Priority/Status/Reason/Impact/Dependency/Risk/Completion Criteria). 완료 항목은 한 줄로 압축하고 CurrentState.md 세션 번호를 연결한다.
- docs/CurrentState.md: append-only. 세션 번호(9-NN)로 절을 추가하고 배경/구현/변경 파일/검증/다음 단계 진입 시 주의사항 구조를 따른다.

## 커밋
- identity: hyeonuk9201 <hyeonuk92@gmail.com> (다른 이메일로 커밋 금지 — 과거 오타 hyoenuk92@ 있음)
- 형식: `feat|fix|docs|refactor|test|chore: 간결한 설명` — prefix 생략 금지, 메시지 선행 공백 금지.

## 금지 패턴 (대안 포함)
- alert()/confirm() → 2단계 인라인 확인 버튼(is-confirming 패턴, 기존 Song/Page 삭제 참조)
- prompt() → showTextPrompt() 인앱 모달(index.html에 이미 존재)
- localStorage 직접 접근 → persistence/StorageAdapter.js 경유
- dispatch() 직접 호출 → CommandBus.execute() 경유

## 에스컬레이션 (구현하지 말고 제안만)
- 새 Decision이 필요해 보이는 설계 판단
- 기존 D-NNN과 충돌하는 요구(TODO.md의 ⚠ 항목: 스타일 프리셋 다중 적용=D-024, Song Undo=D-027)
- 문서 구조 변경(파일 분리/통합/Tier 변경)
단, 완료 처리에 필요한 루틴 기록(TODO 체크, 세션 기록, ManualTestChecklist 갱신)은 계속한다.

## Skills
- 구조에 영향 있는 변경 전: .claude/skills/architecture-review 적용
- 기존 코드 수정: .claude/skills/fnr-patch — 전체 재작성 금지, 최소 패치
