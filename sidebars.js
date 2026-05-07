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
        'intro/demos',
      ],
    },
    {
      type: 'category',
      label: 'Core',
      collapsed: false,
      items: ['core/stcore', 'core/stcorev2', 'core/comparison'],
    },
    {
      type: 'category',
      label: 'SDK',
      collapsed: false,
      items: [
        'sdk/overview',
        'sdk/web',
        'sdk/python',
        'sdk/unity',
        'sdk/ue',
      ],
    },
    {
      type: 'category',
      label: 'ExaStudio',
      items: ['exastudio/overview'],
    },
    {
      type: 'category',
      label: 'ExaTools',
      items: ['exatools/overview', 'exatools/iranalyzer'],
    },
    {
      type: 'category',
      label: '데모',
      items: ['demos/overview'],
    },
  ],
};

export default sidebars;
