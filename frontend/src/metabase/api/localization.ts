import { getBasename } from "metabase/utils/basename";
import {
  type LocaleDataWithLanguage,
  setLocalization,
} from "metabase/utils/i18n";

// note this won't refresh strings that are evaluated at load time
export async function loadLocalization(
  locale: string,
): Promise<LocaleDataWithLanguage> {
  // we need to be sure to set the initial localization before loading any files
  // so load metabase/services only when we need it
  // load and parse the locale
  const translationsObject: LocaleDataWithLanguage =
    // We don't use I18NApi.locale/the GET helper because those helpers adds custom headers,
    // which will make the browser do the pre-flight request on the SDK.
    // The backend doesn't seem to support pre-flight request on the static assets, but even
    // if it supported them it's more performant to skip the pre-flight request
    await fetch(`${getBasename()}/app/locales/${locale}.json`).then(
      (response) => response.json(),
    );
  setLocalization(translationsObject);

  return translationsObject;
}
