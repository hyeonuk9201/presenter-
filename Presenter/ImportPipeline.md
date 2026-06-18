:::writing{variant="document" id="90122"} # ImportPipeline.md

## Purpose

Import Pipeline의 목적은 외부 데이터를 Presenter Domain으로 변환하는 것이다.

Import는 UI, Store, Output을 직접 변경하지 않는다.

Import의 책임은 Domain 객체 생성까지이다.

---

# Pipeline

External Input ↓ Parse ↓ ImportData ↓ Validate ↓ PageBuilder ↓ Presentation

---

# Responsibilities

## Parse

외부 데이터를 해석한다.

예:

- Text File - Image File - Video File - Future Formats

Parser는 Domain 객체를 생성하지 않는다.

결과는 ImportData이다.

---

## ImportData

Import 전용 중간 모델.

ImportData는 Domain 객체가 아니다.

Import Pipeline 내부에서만 사용한다.

---

## Validate

ImportData가 유효한지 검사한다.

예:

- 빈 데이터 - 손상된 데이터 - 지원하지 않는 형식

Validation은 Domain 객체를 생성하지 않는다.

---

## PageBuilder

ImportData를 Domain으로 변환한다.

Page 생성 책임은 Builder에 있다.

Importer는 Page를 직접 생성하지 않는다.

---

# Import Boundary

Import는 다음을 직접 수행하지 않는다.

- UI 변경 - Store 변경 - Output 변경 - Live 송출

Import는 Domain 생성까지만 책임진다.

---

# Asset Support

Importer는 Asset을 생성할 수 있다.

예:

- Image Asset - Video Asset

Page 생성 책임은 Builder에 있다.

---

# Future Compatibility

새로운 Import Format 추가 시

- Text Importer - Image Importer - Video Importer

는 ImportData 생성까지만 책임진다.

Page 생성 규칙은 PageBuilder에서 관리한다.

이를 통해 Import 포맷별 Domain 생성 로직의 중복을 방지한다. :::