---
title: 데모 목록
---

# 데모

## three-basic

`three-basic`은 Web SDK를 Three.js 장면에 붙이는 공식 브라우저 데모입니다.
`simple.ts`가 씬 생성, Web Audio graph, sound collider, material table, source/listener
movement, MT startup을 한 번에 보여주는 기준 예제입니다.

| 항목 | 내용 |
|---|---|
| 문서 내 정적 MT 데모 | `/demos/three-basic/simple.html` |
| 로컬 demo repo | `projects/soundtrace-three-basic` |
| SDK snapshot sync | `SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk` |
| MT 실행 조건 | COOP/COEP headers, `SharedArrayBuffer`, `crossOriginIsolated === true` |

문서 preview 서버는 다음 명령으로 실행합니다.

```bash
BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

`npm run serve`는 `Cross-Origin-Opener-Policy: same-origin`과
`Cross-Origin-Embedder-Policy: require-corp`를 보냅니다. `/docs/...` 배포 경로로
preview할 때는 build에도 `BASE_URL=/docs/`를 지정해야 Docusaurus client route와
정적 파일 prefix가 일치합니다. 다른 정적 서버에서 데모를 열 때도 같은 헤더가 필요합니다.

`simple.html` 데모에서 `Backend`를 `mt`로 선택하면 Web SDK `thread: 'mt'` 경로를 사용합니다.
이 경로는 worker-hosted control 구조이며, main thread가 MT WASM control loop를 직접
실행하지 않습니다. `source transform`, `listener transform`, `mesh transform`은 HOT
lane으로 전달되고, create/delete/material/mesh upload/BVH/options 같은 non-transform
작업은 command channel로 처리됩니다.

오디오 경로는 앱이 만든 `AudioContext`와 `AudioWorkletNode`를 사용합니다. 검증된
MT 브라우저 시나리오는 worker-hosted control, `SharedArrayBuffer`, non-silent audio,
valid path 생성, source/listener/mesh transform 반영을 확인합니다. engine-output-style
data는 MT에서 `debugSnapshot()` 같은 async API로 읽습니다.

로컬에서 sibling SDK와 데모를 같이 확인할 때:

```bash
cd /path/to/soundtrace.js
npm install
npm run build

cd /path/to/soundtrace-three-basic
npm install
SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk
npm run build
npm run dev
```

정적 문서 artifact를 갱신할 때:

```bash
cd /path/to/docs
rsync -a --delete /path/to/soundtrace-three-basic/dist/ static/demos/three-basic/
BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```
