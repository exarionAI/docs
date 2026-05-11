# Sound Tracing Docs

[Docusaurus](https://docusaurus.io) 기반 공식 문서 사이트.

배포: <https://exarionai.github.io/docs/>

## 로컬 개발

```bash
npm install
npm start          # http://localhost:3000/ (전체 locale 정적 preview)
npm run dev        # http://localhost:3000/ (한국어 hot reload)
npm run build      # build/ 디렉터리로 정적 빌드
BASE_URL=/docs/ npm run build  # GitHub Pages project URL용 빌드
```

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
