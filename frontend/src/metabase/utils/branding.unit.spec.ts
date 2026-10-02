import {
  getDisplaySiteName,
  getProductNameForLocale,
} from "metabase/utils/branding";

describe("branding", () => {
  it.each(["zh", "zh-CN", "zh-HK", "zh-TW"])(
    "uses the Chinese product name for %s",
    (locale) => {
      expect(getProductNameForLocale(locale)).toBe("数据看板");
    },
  );

  it.each(["en", "fr", "de", undefined])("uses Dashboard for %s", (locale) => {
    expect(getProductNameForLocale(locale)).toBe("Dashboard");
  });

  it("preserves a configured site name", () => {
    expect(getDisplaySiteName("分析系统")).toBe("分析系统");
  });
});
