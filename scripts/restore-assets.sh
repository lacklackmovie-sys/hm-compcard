#!/bin/bash
# 바이너리 자산(글꼴, MediaPipe wasm·얼굴 모델, 아이콘)을 복원합니다. npm ci 이후에 실행하세요.
set -euo pipefail
mkdir -p src/fonts public/mediapipe/wasm public/models public/icons
cp node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2 src/fonts/
FS=node_modules/@fontsource
for w in 400 600; do
  cp $FS/playfair-display/files/playfair-display-latin-$w-normal.woff2 src/fonts/
  cp $FS/bodoni-moda/files/bodoni-moda-latin-$w-normal.woff2 src/fonts/
done
cp $FS/playfair-display/files/playfair-display-latin-400-italic.woff2 src/fonts/
for w in 500 600; do cp $FS/cormorant-garamond/files/cormorant-garamond-latin-$w-normal.woff2 src/fonts/; done
for w in 300 400 600; do cp $FS/montserrat/files/montserrat-latin-$w-normal.woff2 src/fonts/; done
cp node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm public/mediapipe/wasm/
curl -sfL -o public/models/face_landmarker.task https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
echo "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff  public/models/face_landmarker.task" | sha256sum -c
for f in icons-b64/*.b64; do base64 -d "$f" > "public/icons/$(basename "$f" .b64)"; done
