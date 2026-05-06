import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.hero)}>
      <div className="container">
        <h1 className={styles.title}>{siteConfig.title}</h1>
        <p className={styles.tagline}>{siteConfig.tagline}</p>
        <div className={styles.cta}>
          <Link
            className="button button--primary button--lg"
            to="/intro/what-is-soundtracing">
            시작하기 →
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.ctaSecondary)}
            to="/sdk/overview">
            SDK 살펴보기
          </Link>
        </div>
      </div>
    </header>
  );
}

const products = [
  {
    title: 'SDK',
    href: '/sdk/overview',
    desc: 'C/C++ 코어와 각 플랫폼용 바인딩. 음향 시뮬레이션을 직접 통합할 때.',
  },
  {
    title: 'ExaStudio',
    href: '/exastudio/overview',
    desc: '음향 장면을 시각적으로 구성·렌더링하는 크로스플랫폼 워크플로우 도구.',
  },
  {
    title: 'ExaTools',
    href: '/exatools/overview',
    desc: 'IR 분석·검증·시각화 등 음향 시뮬레이션 결과를 다루는 유틸리티.',
  },
];

function Products() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>제품군</h2>
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
        <h2 className={styles.sectionTitle}>무엇을 하는가</h2>
        <div className={styles.highlightGrid}>
          <div>
            <h3>물리 기반 IR 합성</h3>
            <p>메시·재질에서 직접 임펄스 응답을 생성합니다. 휴리스틱 리버브 프리셋과 달리 장면 변화에 자연스럽게 적응합니다.</p>
          </div>
          <div>
            <h3>실시간 응답</h3>
            <p>청취자·음원·환경이 변할 때 IR을 갱신합니다. 게임·VR·시뮬레이터에 적용 가능한 지연으로 동작합니다.</p>
          </div>
          <div>
            <h3>크로스플랫폼</h3>
            <p>Windows·macOS·Linux 네이티브, WebAssembly, 그리고 Unity·Unreal Engine 바인딩(예정).</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <Highlights />
        <Products />
      </main>
    </Layout>
  );
}
