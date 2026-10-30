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
├── intro/            # 소개 (what-is-soundtracing, features)
├── sdk/              # overview, web(+web/facade, web/native), unity, ue, fmod, wwise, performance
└── legal/            # licenses
i18n/<locale>/docusaurus-plugin-content-docs/current/   # en, ja, zh-Hans, zh-Hant 번역 (같은 경로)
static/img/           # 이미지 (아래 이미지 이력 참고)
```

문서 기준: 엔진 2.22.0 / ABI 6, SDK 릴리스 2.22.0-jhj.6. 엔진·플러그인 사실관계의 원천은
SimpleST 저장소의 `engine/ABI/*.h`, `plugins/*/README.md`다. 문서상 제품명은 **Sound-Tracing SDK**(for Unity / for Unreal Engine /
for FMOD / for Wwise / for Web)로 통일하고, `SimpleST*`는 바이너리·식별자·DSP 이름으로만 남긴다(2026-10-30).
STCoreV2 대응표, Python 바인딩, ExaTools, Core(네이티브 엔진), 제품군 페이지와 릴리스 이력 서술은 2026-10-30에 제거했다. `static/img/core/*`는 페이지가 없어 현재 미사용이다.

## 이미지 이력

플레이스홀더 PNG는 2026-10-30 기준 모두 실제 이미지로 교체됐다(남은 것 없음).

실제 이미지가 이미 있는 것: `web/demo-*.png`, `intro/path-visualization.png`(2026-10-30 사용자 제공 데모 캡처 873×484), `unity/*.png`(Manager/Listener/Source/Object/PathVisualizer 인스펙터는 2026-10-29 SDK 2.22로 재촬영,
나머지는 STCoreV2 시절 캡처).

2026-10-29 실제 화면으로 교체(macOS, SDK 2.22.0-jhj.5): UE 5.7(Lyra) Project Settings·Listener·Source Settings 에셋·Object 컴포넌트·
Mac 오디오 플러그인 설정, Wwise 2025.1.11 버스·Renderer·Source Settings 메타데이터·Positioning·Launcher·UE 설치 결과,
FMOD Studio 2.04 마스터 버스 Listener·이벤트 Source·Source 덱·플러그인 폴더.

2026-10-29 설치 흐름 변경(SDK 2.22.0-jhj.6, Unity·UE 설치 메뉴 제거)으로 `fmod/unity-install-menu.png`·`wwise/unity-install-menu.png`를
지우고 `fmod/unity-fmod-edition-import.png`(FMOD 에디션 패키지 가져오기)·`wwise/launcher-modify-project.png`(런처 Modify Wwise in Project)를
새로 찍었다. `wwise/launcher-bundle.png`는 Sound-tracing이 설치된 목록으로 다시 찍었다.

2026-10-30 개념도 9장(`core/pipeline-overview`·`engine-shells`·`hybrid-early-reflections`·`host-pull-render`, `intro/pipeline-concept`,
`web/architecture`, `ue/integration-mode`, `fmod/structure`, `wwise/structure`)을 HTML→PNG(Playwright, 1280×720 @2x, 영문 라벨)로
그려 넣었다. `ue/path-visualizer.png`는 2026-10-30 Lyra Mac Shipping 패키지(Expanse, F6 경로 시각화)에서 캡처했다. `fmod/ue-plugin-files.png`는 2026-10-30 문서에서 빼고 삭제했다(FMOD for Unreal이 이 Mac에 없어 촬영 불가). 플레이스홀더는 더 없다.

플레이스홀더를 다시 만들려면 `scripts/`가 아니라 세션 스크래치의 `placeholder.swift`를 썼다
(AppKit으로 텍스트를 그린 PNG). 같은 형식이 필요하면 아무 PNG나 1280×720으로 덮어쓰면 된다.
