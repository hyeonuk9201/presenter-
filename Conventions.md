# TC-Presenter Conventions

## Naming Rules

### Entity

PascalCase 사용.

```js
Page
Presentation
Session
```

### State

camelCase 사용.

```js
selectedPageId
livePageId
fontSize
```

### Action

UPPER_SNAKE_CASE 사용.

```js
ADD_PAGE
DELETE_PAGE
UPDATE_PAGE
MOVE_PAGE

SELECT_PAGE
GO_LIVE
CLEAR_LIVE
```

---

## Store Rules

상태 변경은 반드시 dispatch()를 통해 수행한다.

허용:

```js
dispatch({
  type: 'GO_LIVE',
  pageId
})
```

금지:

```js
state.session.live.livePageId = pageId
```

---

## Domain Rules

Domain은 UI를 모른다.

허용:

```js
createTextPage()
updatePage()
movePage()
```

금지:

```js
document.createElement(...)
window.alert(...)
```

---

## UI Rules

UI의 책임:

* 입력 받기
* 이벤트 전달
* 상태 표시

비즈니스 로직은 Domain 또는 Store에 둔다.

---

## Renderer Rules

Renderer는 DOM 상태를 읽지 않는다.

Renderer는 Store 상태만 사용한다.

좋음:

```text
Store
 ↓
Renderer
```

지양:

```text
DOM
 ↓
Renderer
```

---

## Ownership Rules

Page는 Element 순서(elementIds)의 소유자이다. 시각 표현 데이터는 Element가 가진다.

Presentation은 Page 순서(pageIds)와 Page/Element 저장소(pageMap/elementMap)의 소유자이다.

Session은 런타임 상태(selection, clipboard, textEditing, interaction, persistence)의 소유자이다. (D-014, "PresenterState" 명칭 폐기)

각 객체는 자신의 책임 외 데이터를 직접 수정하지 않는다.

---

## Runtime Rules

selectedPageId 와 livePageId 는 절대 합치지 않는다.

편집 상태와 송출 상태는 서로 다른 Change Reason을 가진다.

---

## Future Rule

새 기능 추가 시

"어디에 구현할까?"

보다

"누가 책임져야 하는가?"

를 먼저 판단한다.
