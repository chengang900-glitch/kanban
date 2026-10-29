import {
  type LocaleDataWithLanguage,
  setLocalization,
} from "metabase/utils/i18n";

/**
 * Loads a locale's catalogue from our own bundle.
 *
 * Imported rather than fetched so the catalogues go through the same pipeline as
 * every other asset: rspack hashes each one, emits it as its own chunk, writes
 * the `.br` and `.gz` siblings, and resolves the URL at runtime. A hashed chunk
 * is cacheable, which a fetch of `app/locales/<locale>.json` never qualified for.
 */
function loadLocaleCatalog(locale: string): Promise<LocaleDataWithLanguage> {
  return import(
    /* webpackChunkName: "locale-[request]" */
    `locales/${locale.replace(/-/g, "_")}.json`
  ).then((module) => module.default);
}

// note this won't refresh strings that are evaluated at load time
export async function loadLocalization(
  locale: string,
): Promise<LocaleDataWithLanguage> {
  const translationsObject = await loadLocaleCatalog(locale);
  setLocalization(translationsObject);

  return translationsObject;
}
