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
빌드한 뒤 같은 serve 명령을 실행합니다. `npm run builld`처럼 오타가 나면 빌드가
실행되지 않습니다.

## 구조

```
docs/
├── intro/        # 소개 (what-is-soundtracing, features, products)
├── core/         # STCoreV2
├── sdk/          # overview, web(+web/facade, web/native), unity, ue, python, performance
└── exatools/     # ExaTools (overview, iranalyzer)
```
