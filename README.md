# HM 컴카드 메이커 (HONEY MEDIA)

모델 컴카드를 자동으로 만드는 **설치형 웹앱(PWA)** 입니다. 크롬에서 한 번 열어 설치하면 바탕화면 아이콘으로 실행되고, 이후에는 **인터넷 없이** 동작합니다. 서버·로그인이 없고 사진과 데이터는 사용하는 컴퓨터(IndexedDB)에만 저장됩니다.

- 주소: https://lacklackmovie-sys.github.io/hm-compcard/
- 기술: React + TypeScript + Vite, vite-plugin-pwa, Canvas 렌더링, jsPDF, MediaPipe Face Landmarker(얼굴 인식, 기기 안에서만 실행)

## 개발
```bash
npm ci
bash scripts/restore-assets.sh   # 글꼴·wasm·얼굴 모델·아이콘 복원 (바이너리는 저장소에 넣지 않음)
npm run dev
npm run build
```
GitHub Actions(`.github/workflows/deploy.yml`)가 main 브랜치에 push 될 때 빌드해서 `gh-pages` 브랜치로 배포합니다.
