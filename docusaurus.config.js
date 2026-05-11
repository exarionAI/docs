// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

const baseUrl = process.env.BASE_URL || '/';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Sound Tracing',
  tagline: '실시간 공간 음향 시뮬레이션 SDK · 제품군',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://exarionai.github.io',
  // Local preview uses '/'. GitHub Pages project deployment sets BASE_URL=/docs/.
  baseUrl,

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
    locales: ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant'],
    localeConfigs: {
      ko: {
        label: '한국어',
        htmlLang: 'ko-KR',
      },
      en: {
        label: 'English',
        htmlLang: 'en-US',
      },
      ja: {
        label: '日本語',
        htmlLang: 'ja-JP',
      },
      'zh-Hans': {
        label: '简体中文',
        htmlLang: 'zh-CN',
      },
      'zh-Hant': {
        label: '繁體中文',
        htmlLang: 'zh-TW',
      },
    },
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
      image: 'img/social-card.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Sound Tracing',
        logo: {
          alt: 'EXARION',
          src: 'img/logo.png',
          srcDark: 'img/logo-dark.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'mainSidebar',
            position: 'left',
            label: '문서',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '제품',
            items: [
              {label: 'Core', to: '/core/stcorev2'},
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
