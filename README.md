# Sound Tracing Docs

배포: <https://exarionai.github.io/docs/>

## 로컬 개발

```bash
npm install
npm run dev                  # http://localhost:3000/ (기본 locale: 한국어 hot reload)
npm run dev -- --locale en   # 특정 locale 개발 서버 (en, ja, zh-Hans, zh-Hant)
npm run build                # 모든 locale을 build/ 디렉터리로 정적 빌드
BASE_URL=/docs/ npm run build # /docs/ 배포 경로까지 확인할 preview 빌드
npm run serve -- --port 3100  # build/ 결과물로 전체 locale 정적 preview
npm start                    # npm run build && npm run serve
npm run build:github         # GitHub Pages project URL(/docs/)용 전체 locale 빌드
```

언어 선택 드롭다운까지 확인할 때는 `npm run dev` 대신 `npm run build` 후
`npm run serve -- --port 3100`를 사용합니다. `http://127.0.0.1:3100/docs/sdk/web`
같은 GitHub Pages 배포 경로까지 확인할 때는 `BASE_URL=/docs/ npm run build`로
빌드한 뒤 같은 serve 명령을 실행합니다.

## 구조

```
docs/                 # 한국어 정본
├── intro/            # 소개 (what-is-soundtracing, features, products)
├── core/             # simplest (현행 엔진), stcorev2 (STCoreV2 → SimpleST 마이그레이션, 구 URL 유지)
├── sdk/              # overview, web(+web/facade, web/native), unity, ue, fmod, wwise, python, performance
├── exatools/         # ExaTools (overview, iranalyzer)
└── legal/            # licenses
i18n/<locale>/docusaurus-plugin-content-docs/current/   # en, ja, zh-Hans, zh-Hant 번역 (같은 경로)
static/img/           # 이미지 (아래 플레이스홀더 목록 참고)
```

문서 기준: **SimpleST 2.18.2 / ABI 6**, SDK 릴리스 2.18.2-jhj.7 (2026-10-27, 이전 SDK 릴리스: 엔진 2.12.0). 엔진·플러그인 사실관계의 원천은
SimpleST 저장소의 `engine/ABI/*.h`, `plugins/*/README.md`다.

## 이미지 플레이스홀더 교체 목록

아래 파일은 `PLACEHOLDER`가 찍힌 1280×720 PNG다. **같은 파일명으로 실제 스크린샷/도판을 덮어쓰면**
문서 수정 없이 반영된다. 각 항목의 설명이 그 자리에 들어갈 그림의 내용이다.

| 파일 (`static/img/`) | 들어갈 그림 | 쓰이는 페이지 |
|---|---|---|
| `core/pipeline-overview.png` | SceneManager → STPropagator → STIRConverter → Auralizator(Online/Offline) 파이프라인 도판 | core/simplest |
| `core/engine-shells.png` | STRealTimeEngine / STRealTimeMultiEngine / STOfflineEngine 셸 3종 도판 | core/simplest |
| `core/hybrid-early-reflections.png` | Hybrid 초기 반사: exact 오브젝트 예산(반사 12+4·회절 3+1) + HOA3 bed 개념도 | core/simplest |
| `core/host-pull-render.png` | DEVICE / HOST_PULL / HOST_PULL_BUFFERED 출력 모드와 호스트 콜백 흐름 | core/simplest |
| `core/demo-app.png` | `SimpleST_demo_app` 실시간 데모 화면(씬·경로 시각화) | core/simplest |
| `intro/pipeline-concept.png` | 음원 → 직접음/투과/반사/회절 → 리스너, 확산 수송 → late reverb 개념도 | intro/what-is-soundtracing |
| `web/architecture.png` | soundtrace.js: 메인 스레드 facade → control Worker(pthread WASM) → AudioWorklet, Offline Worker | sdk/web |
| `ue/project-settings.png` | Project Settings › Plugins › SoundTracing (Runtime/Propagation/Listener/Sources/Materials) | sdk/ue |
| `ue/listener-settings.png` | FSoundTracingListenerSettings 인스펙터 | sdk/ue |
| `ue/source-settings-asset.png` | SoundTracing Source Settings 에셋 인스펙터 | sdk/ue |
| `ue/object-component.png` | SoundTracingObjectComponent 인스펙터(Acoustic Mobility, 재질 슬롯, Auto Set Materials) | sdk/ue |
| `ue/path-visualizer.png` | Niagara 경로 시각화 실행 화면 | sdk/ue |
| `ue/audio-plugin-settings.png` | Project Settings › Platforms › Audio의 Spatialization / Source Data Override = SoundTracing | sdk/ue |
| `ue/integration-mode.png` | Build.cs가 Wwise → FMODStudio → Native 순으로 통합을 고르는 도판 | sdk/ue |
| `fmod/structure.png` | SimpleSTFmod 구조도(Source DSP → SystemRuntime → Listener DSP) | sdk/fmod |
| `fmod/studio-master-bus-listener.png` | FMOD Studio 마스터 버스에 SimpleST Listener 삽입 화면 | sdk/fmod |
| `fmod/studio-event-source.png` | 3D 이벤트 마스터 트랙의 SimpleST Source(FMOD Spatializer 제거) | sdk/fmod |
| `fmod/studio-source-params.png` | SimpleST Source 덱 UI 파라미터 | sdk/fmod |
| `fmod/studio-plugins-folder.png` | Studio 프로젝트 `Plugins/` 또는 사용자 플러그인 폴더의 배포 파일 | sdk/fmod |
| `fmod/ue-plugin-files.png` | UE Project Settings › FMOD Studio › Plugin Files의 SimpleSTFmod | sdk/fmod, sdk/ue |
| `fmod/unity-install-menu.png` | Unity SoundTrace › FMOD › Install 메뉴와 Dynamic Plugins 등록 결과 | sdk/fmod, sdk/unity |
| `wwise/structure.png` | SimpleSTWwise 구조도(Audio Objects 버스 → Sound-tracing Renderer) | sdk/wwise |
| `wwise/bus-audio-objects.png` | 버스 Bus Configuration = Audio Objects + Renderer 삽입 | sdk/wwise |
| `wwise/renderer-properties.png` | Sound-tracing Renderer 프로퍼티(Wet/Dry/HRTF) | sdk/wwise |
| `wwise/source-settings-metadata.png` | Metadata › Sound-tracing Source Settings 프로퍼티 | sdk/wwise |
| `wwise/positioning-attenuation.png` | 3D 사운드 Positioning(Listener Relative Routing, Attenuation 끔) | sdk/wwise |
| `wwise/launcher-bundle.png` | Audiokinetic Launcher › Add from directory 번들 설치 | sdk/wwise |
| `wwise/ue-install.png` | UE WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin 설치 결과 | sdk/wwise, sdk/ue |
| `wwise/unity-install-menu.png` | Unity SoundTrace › Wwise › Install 메뉴 | sdk/wwise, sdk/unity |

실제 이미지가 이미 있는 것: `web/demo-*.png`, `intro/path-visualization.png`(공개 Sound-tracing 데모
스크린샷 복사), `unity/*.png`(STCoreV2 시절 캡처 — Manager/Listener/Source/Object 인스펙터는 필드가
바뀌었으므로 **재촬영 권장**: `Img_STManager.png`, `Img_STListener.png`, `Img_STSource.png`, `Img_STObj.png`).

플레이스홀더를 다시 만들려면 `scripts/`가 아니라 세션 스크래치의 `placeholder.swift`를 썼다
(AppKit으로 텍스트를 그린 PNG). 같은 형식이 필요하면 아무 PNG나 1280×720으로 덮어쓰면 된다.
