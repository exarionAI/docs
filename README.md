# Sound Tracing Docs

[Docusaurus](https://docusaurus.io) 기반 공식 문서 사이트.

배포: <https://exarionai.github.io/docs/>

## 로컬 개발

```bash
npm install
npm run dev                  # http://localhost:3000/ (기본 locale: 한국어 hot reload)
npm run dev -- --locale en   # 특정 locale 개발 서버 (en, ja, zh-Hans, zh-Hant)
npm run build                # 모든 locale을 build/ 디렉터리로 정적 빌드
npm run serve                # build/ 결과물로 전체 locale 정적 preview
npm start                    # npm run build && npm run serve
npm run build:github         # GitHub Pages project URL(/docs/)용 전체 locale 빌드
```

언어 선택 드롭다운까지 확인할 때는 `npm run dev` 대신 `npm run build` 후
`npm run serve`를 사용합니다. `npm run builld`처럼 오타가 나면 빌드가 실행되지
않습니다.

## 구조

```
docs/
├── intro/        # 소개 (what-is, features, products, demos)
├── sdk/          # SDK
│   ├── core/    # STCore, STCoreV2
│   └── bindings/ # web, python, unity, ue (예정)
├── exastudio/    # ExaStudio
├── exatools/     # ExaTools
└── demos/        # 데모
```

## 배포

`main` 브랜치에 push 되면 [GitHub Actions](.github/workflows/deploy.yml)가 자동으로
빌드·배포합니다.
