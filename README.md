# 교실 도구함

교사를 위한 브라우저 기반 도구 모음입니다. 별도 설치나 빌드 없이 정적 파일만으로 동작합니다.

- **자리 바꾸기**: 학생 명단 입력, 좌석 행·열 설정, 좌석 고정, 무작위 배치, 직전 배치 복원
- **PDF 글자 수 세기**: 공백 포함·제외 글자 수, 어절, 페이지 수, 200자 원고지 분량
- **생활기록부 개인정보 가리기**: 텍스트·스캔 PDF에서 이름, 학번, 연락처, 학교, 지역 등을 찾아 가림 처리

## 개인정보 처리

모든 처리는 브라우저 안에서 이루어집니다. PDF 파일과 학생 명단은 어떤 서버로도 전송되지 않습니다.
자리 배치 데이터는 브라우저 localStorage에만 저장됩니다.
PDF.js와 Tesseract OCR(한국어 데이터 포함)은 `dist/vendor/`에 포함되어 있어 외부 CDN을 사용하지 않습니다.

## 실행

`dist/` 폴더를 정적 서버로 열면 됩니다. ES 모듈을 사용하므로 `file://`로 직접 열지 말고 로컬 서버를 사용하세요.

```bash
cd dist && python3 -m http.server 4173
```

브라우저에서 `http://127.0.0.1:4173`에 접속합니다.

## 서드파티 라이선스

- [PDF.js](https://github.com/mozilla/pdf.js) — Apache License 2.0 (`dist/vendor/pdfjs/LICENSE`)
- [Tesseract.js](https://github.com/naptha/tesseract.js), tesseract.js-core, 한국어 학습 데이터 — Apache License 2.0 (`dist/vendor/tesseract/`)
