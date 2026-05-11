import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  const tagline = translate({
    id: 'homepage.hero.tagline',
    message: '실시간 공간 음향 시뮬레이션 SDK · 제품군',
  });

  return (
    <header className={clsx('hero', styles.hero)}>
      <div className="container">
        <h1 className={styles.title}>{siteConfig.title}</h1>
        <p className={styles.tagline}>{tagline}</p>
        <div className={styles.cta}>
          <Link
            className="button button--primary button--lg"
            to="/intro/what-is-soundtracing">
            <Translate id="homepage.hero.primaryCta">시작하기 →</Translate>
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.ctaSecondary)}
            to="/sdk/overview">
            <Translate id="homepage.hero.secondaryCta">SDK 살펴보기</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

function getProducts() {
  return [
    {
      title: 'Core',
      href: '/core/stcorev2',
      desc: translate({
        id: 'homepage.products.core.desc',
        message:
          'C/C++ 네이티브 음향 시뮬레이션 엔진. STCore(1세대, FPGA 가속)와 STCoreV2(모듈식·lock-free).',
      }),
    },
    {
      title: 'SDK',
      href: '/sdk/overview',
      desc: translate({
        id: 'homepage.products.sdk.desc',
        message:
          'Web · Python · Unity · Unreal 바인딩 라인업 (예정). Core를 각 플랫폼에서 사용.',
      }),
    },
    {
      title: 'ExaStudio',
      href: '/exastudio/overview',
      desc: translate({
        id: 'homepage.products.exastudio.desc',
        message:
          '음향 장면을 시각적으로 구성·렌더링하는 크로스플랫폼 워크플로우 도구.',
      }),
    },
    {
      title: 'ExaTools',
      href: '/exatools/overview',
      desc: translate({
        id: 'homepage.products.exatools.desc',
        message:
          'IR 분석·검증·시각화 등 음향 시뮬레이션 결과를 다루는 유틸리티.',
      }),
    },
  ];
}

function Products() {
  const products = getProducts();

  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          <Translate id="homepage.products.title">제품군</Translate>
        </h2>
        <div className={styles.cards}>
          {products.map((p) => (
            <Link key={p.title} to={p.href} className={styles.card}>
              <h3 className={styles.cardTitle}>{p.title}</h3>
              <p className={styles.cardDesc}>{p.desc}</p>
              <span className={styles.cardArrow}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className={clsx(styles.section, styles.highlights)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          <Translate id="homepage.highlights.title">무엇을 하는가</Translate>
        </h2>
        <div className={styles.highlightGrid}>
          <div>
            <h3>
              <Translate id="homepage.highlights.ir.title">
                물리 기반 IR 합성
              </Translate>
            </h3>
            <p>
              <Translate id="homepage.highlights.ir.desc">
                메시·재질에서 직접 임펄스 응답을 생성합니다. 휴리스틱 리버브
                프리셋과 달리 장면 변화에 자연스럽게 적응합니다.
              </Translate>
            </p>
          </div>
          <div>
            <h3>
              <Translate id="homepage.highlights.realtime.title">
                실시간 응답
              </Translate>
            </h3>
            <p>
              <Translate id="homepage.highlights.realtime.desc">
                청취자·음원·환경이 변할 때 IR을 갱신합니다.
                게임·VR·시뮬레이터에 적용 가능한 지연으로 동작합니다.
              </Translate>
            </p>
          </div>
          <div>
            <h3>
              <Translate id="homepage.highlights.crossPlatform.title">
                크로스플랫폼
              </Translate>
            </h3>
            <p>
              <Translate id="homepage.highlights.crossPlatform.desc">
                Windows·macOS·Linux 네이티브, WebAssembly, 그리고 Unity·Unreal
                Engine 바인딩(예정).
              </Translate>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  const description = translate({
    id: 'homepage.hero.tagline',
    message: '실시간 공간 음향 시뮬레이션 SDK · 제품군',
  });

  return (
    <Layout title={siteConfig.title} description={description}>
      <Hero />
      <main>
        <Highlights />
        <Products />
      </main>
    </Layout>
  );
}
