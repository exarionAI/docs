---
title: 데모 목록
description: Sound-tracing.js 공식 올인원 브라우저 데모.
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# 데모

## Sound-tracing.js 올인원 데모

기존 `three-basic` 정적 데모는
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing)의 최신 build로
교체되었습니다. 배포 URL은 유지하지만 내용은 Capability, Shoebox, Multiroom 세 장면을
포함하는 하나의 애플리케이션입니다.

<a href={useSharedStaticUrl('/demos/three-basic/')} target="_blank" rel="noreferrer">
  데모를 새 창에서 열기
</a>

| 장면 | 목적 |
|---|---|
| Capability | 브라우저, AudioWorklet, WebAssembly, MT, WebGPU 지원 확인 |
| Shoebox | source/listener 이동, 재질, 반사와 품질 preset 비교 |
| Multiroom | 여러 source, 문 개폐, 차폐와 room 간 전파 비교 |

## 선택 항목

| UI | 값 |
|---|---|
| Backend | Single Thread, Multi Thread, WebGPU |
| Quality | Fast, Middle, Quality |
| Material | 장면별 SoundTrace material preset |

HRTF는 SDK 문서의 [Band8/Parametric 선택](../sdk/web.md#hrtf-선택)을 참고하십시오.

## 실행 조건

- Single Thread: 일반 정적 hosting
- Multi Thread: COOP/COEP와 `SharedArrayBuffer`
- WebGPU: `navigator.gpu`와 hardware acceleration
- 공간 음향 비교: 헤드폰 권장

문서 preview 서버는 데모에 필요한 COOP/COEP header를 함께 보냅니다.

```bash
BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

## 정적 artifact 갱신

```bash
export SOUND_TRACING_DEMO=/path/to/Sound-tracing
export SOUNDTRACE_DOCS=/path/to/docs

cd "$SOUND_TRACING_DEMO"
npm run build

rsync -a --delete \
  "$SOUND_TRACING_DEMO/dist/" \
  "$SOUNDTRACE_DOCS/static/demos/three-basic/"
```

문서에 포함되는 demo build는 licensed SDK file을 포함하므로 공개 배포 권한과 라이선스
범위를 확인한 뒤 배포해야 합니다.
