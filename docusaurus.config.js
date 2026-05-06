// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Sound Tracing',
  tagline: '실시간 공간 음향 시뮬레이션 SDK · 제품군',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // TODO: 실제 GH Pages URL로 교체 (예: https://exarionai.github.io)
  url: 'https://exarionai.github.io',
  // TODO: 문서 레포 이름이 정해지면 '/<repo>/' 로 수정
  baseUrl: '/docs/',

  organizationName: 'exarionAI',
  projectName: 'docs',

  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Sound Tracing',
        logo: {
          alt: 'Sound Tracing',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'mainSidebar',
            position: 'left',
            label: '문서',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '제품',
            items: [
              {label: 'SDK', to: '/sdk/overview'},
              {label: 'ExaStudio', to: '/exastudio/overview'},
              {label: 'ExaTools', to: '/exatools/overview'},
            ],
          },
          {
            title: '리소스',
            items: [
              {label: '데모', to: '/demos/overview'},
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} ExarionAI. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['cpp', 'c', 'cmake', 'bash'],
      },
    }),
};

export default config;
