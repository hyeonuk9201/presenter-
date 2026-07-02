# FutureEditor.md

> status: Proposal

> 이 문서는 미래 Editor 방향성을 기록한다.
> 현재 구현을 의미하지 않는다.
> FutureDomain보다 구현 우선순위가 낮다.

---

# Motivation

Presentation의 Page 수가 많아질수록 운영자가 전체 흐름을 이해하기 어려워진다.

Editor는 단순히 Page를 편집하는 도구를 넘어 Presentation의 구조(콘티)를 이해하고 관리할 수 있어야 한다.

# Editor Outline

Editor는 Presentation을 Outline 형태로 표시할 수 있다.

예시

▼ Opening
  Intro

▼ Praise
  Verse 1
  Verse 2
  Chorus

▼ Sermon
  Title
  Scripture

▼ Ending
  Blessing

Outline은 Editor 전용 표현이며 Domain에는 영향을 주지 않는다.

# Section

Section은 Page를 그룹화하는 Editor 개념이다.

Section은 송출 단위가 아니다.

Page가 여전히 송출 가능한 최소 단위이다.

Section은 다음 정보를 가질 수 있다.

title
note
collapsed
color

# Purpose

Section의 목적

콘티 구조 표현
운영 흐름 이해
대량 Page 탐색
빠른 이동

Section은 Page의 순서를 변경하지 않는다.

# Thumbnail View

Outline은 Page를 다음 형태로 표시할 수 있다.

Text Preview
Thumbnail
Compact View

초기 구현에서는 첫 줄 텍스트만 표시한다.

# Future Features

필요 시 다음 기능을 추가할 수 있다.

접기 / 펼치기
Drag & Drop
Section 메모
Section 색상
Section 단위 복사
검색
즐겨찾기


# concept

1. Editor는 Domain을 변경하지 않고도
Presentation을 다양한 방식으로 표현할 수 있다.
Outline은 그 중 하나이다.

2. Section은 운영 단위(Operational Unit) 를 표현하기 위한 Editor 개념이다.