import { getDefaultLocale, getLocales } from "./utils";

describe("setup locale utilities", () => {
  it("defaults to Chinese (China) when it is available", () => {
    const locales = getLocales([
      ["en", "English"],
      ["zh_CN", "Chinese (China)"],
    ]);

    expect(getDefaultLocale(locales, "en-US")).toEqual({
      code: "zh_CN",
      name: "Chinese (China)",
    });
  });
});
