/* global fetch, console */
/** Seed chart fixtures in the loopback-only synthetic instance after seed-local.mjs. */
const base = "http://127.0.0.1:33419/metabase";
const call = async (path, method = "GET", body, headers = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok)
    throw new Error(path + ": " + res.status + " " + JSON.stringify(data));
  return data;
};
const session = await call("/api/session", "POST", {
  username: "admin@example.invalid",
  password: "Fixture-Only-Password-42!",
});
const h = {
  "X-Metabase-Session": session.id,
  Origin: "http://127.0.0.1:33419",
};
await call("/api/setting/site-locale", "PUT", { value: "zh_CN" }, h);
await call(
  "/api/setting/site-name",
  "PUT",
  { value: "UhooAI 数据分析中心" },
  h,
);
let databases = await call("/api/database", "GET", undefined, h);
let list = databases.data ?? databases;
if (!list.length) {
  await call("/api/database/sample_dataset", "POST", {}, h);
  databases = await call("/api/database", "GET", undefined, h);
  list = databases.data ?? databases;
}
const db = list[0].id;
const cards = [];
for (const value of [65, 1, 0, 100, 125, null]) {
  cards.push(
    await call(
      "/api/card",
      "POST",
      {
        name: `进度 ${value ?? "空值"}`,
        display: "progress",
        dataset_query: {
          database: db,
          type: "native",
          native: {
            query: `SELECT ${value ?? "CAST(NULL AS INTEGER)"} AS "value"`,
          },
        },
        visualization_settings: {
          "progress.value": "value",
          "progress.goal": 100,
          "progress.color": "#00A896",
        },
      },
      h,
    ),
  );
}
const metadata = await call(
  `/api/database/${db}/metadata`,
  "GET",
  undefined,
  h,
);
const orders = metadata.tables.find((t) => t.name === "ORDERS");
const createdAt = orders?.fields.find((f) => f.name === "CREATED_AT");
if (!orders || !createdAt)
  throw new Error("Expected the native Sample Database ORDERS fixture");
const trendQuery = {
  database: db,
  type: "query",
  query: {
    "source-table": orders.id,
    aggregation: [["count"]],
    breakout: [["field", createdAt.id, { "temporal-unit": "month" }]],
  },
};
for (const invert of [false, true]) {
  cards.push(
    await call(
      "/api/card",
      "POST",
      {
        name: `趋势 ${invert ? "反向指标" : "常规指标"}`,
        display: "smartscalar",
        dataset_query: trendQuery,
        visualization_settings: {
          "scalar.field": "count",
          "scalar.comparisons": [{ id: "1", type: "previousValue" }],
          "scalar.switch_positive_negative": invert,
        },
      },
      h,
    ),
  );
}
const dashboard = await call(
  "/api/dashboard",
  "POST",
  { name: "UhooAI 定制隔离验收" },
  h,
);
await call(
  `/api/dashboard/${dashboard.id}`,
  "PUT",
  {
    dashcards: cards.map((c, i) => ({
      id: -i - 1,
      card_id: c.id,
      row: Math.floor(i / 3) * 4,
      col: (i % 3) * 8,
      size_x: 8,
      size_y: 4,
      parameter_mappings: [],
      visualization_settings: {},
    })),
  },
  h,
);
console.log(
  JSON.stringify({
    dashboard_id: dashboard.id,
    cards: cards.map((c) => ({ id: c.id, name: c.name, display: c.display })),
    database: db,
  }),
);
await call("/api/session", "DELETE", { session_id: session.id }, h);
