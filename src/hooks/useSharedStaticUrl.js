import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function useSharedStaticUrl(path) {
  const {i18n, siteConfig} = useDocusaurusContext();
  const localeSuffix =
    i18n.currentLocale === i18n.defaultLocale ? '' : `${i18n.currentLocale}/`;
  const sharedBaseUrl =
    localeSuffix && siteConfig.baseUrl.endsWith(localeSuffix)
      ? siteConfig.baseUrl.slice(0, -localeSuffix.length)
      : siteConfig.baseUrl;

  return `${sharedBaseUrl}${path.replace(/^\/+/, '')}`;
}
