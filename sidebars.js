// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  mainSidebar: [
    {
      type: 'category',
      label: '소개',
      collapsed: false,
      items: [
        'intro/what-is-soundtracing',
        'intro/features',
        'intro/products',
      ],
    },
    {
      type: 'category',
      label: 'Core',
      collapsed: false,
      items: ['core/stcorev2'],
    },
    {
      type: 'category',
      label: 'SDK',
      collapsed: false,
      items: [
        'sdk/overview',
        {
          type: 'category',
          label: 'Web',
          collapsed: false,
          link: { type: 'doc', id: 'sdk/web' },
          items: ['sdk/web/facade', 'sdk/web/native'],
        },
        'sdk/unity',
        'sdk/ue',
        'sdk/python',
        'sdk/performance',
      ],
    },
    {
      type: 'category',
      label: 'ExaTools',
      items: ['exatools/overview', 'exatools/iranalyzer'],
    },
    'legal/licenses',
  ],
};

export default sidebars;
