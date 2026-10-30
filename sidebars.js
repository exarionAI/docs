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
      ],
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
        'sdk/fmod',
        'sdk/wwise',
        'sdk/performance',
      ],
    },
    'legal/licenses',
  ],
};

export default sidebars;
