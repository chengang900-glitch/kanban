import {
  getDisplaySiteName,
  getProductName,
  getProductNameForLocale,
} from "metabase/utils/branding";

describe("branding", () => {
  it.each([undefined, null, "", "   ", "Metabase"])(
    "falls back to the product name for %s",
    (siteName) => {
      expect(getDisplaySiteName(siteName)).toBe(getProductName());
    },
  );
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
    const longName = "企业数据分析中心".repeat(12);
    expect(getDisplaySiteName(longName)).toBe(longName);
  });
});
