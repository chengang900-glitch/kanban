// eslint-disable-next-line metabase/no-literal-metabase-strings -- This is the original product name used only to detect an unchanged default setting.
const DEFAULT_PRODUCT_NAME = "Metabase";

export function getProductNameForLocale(locale?: string): string {
  return locale?.toLowerCase().startsWith("zh") ? "数据看板" : "Dashboard";
}

export function getProductName(): string {
  return getProductNameForLocale(
    window.MetabaseUserLocalization?.headers.language,
  );
}

export function getDisplaySiteName(siteName: string | undefined): string {
  return siteName === DEFAULT_PRODUCT_NAME
    ? getProductName()
    : (siteName ?? "");
}
