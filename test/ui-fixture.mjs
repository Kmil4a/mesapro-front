// Local-only UI verification server. Synthetic data; no database or real tokens.
// Run with: node test/ui-fixture.mjs
// Then run Vite with VITE_API_URL=http://127.0.0.1:4319 and port 5189.
import http from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const location = {
  id: "11111111-1111-4111-8111-111111111111",
  businessId: "22222222-2222-4222-8222-222222222222",
  name: "Sucursal Centro · Demo",
  status: "ACTIVE",
  timezone: "America/Santiago",
  currency: "CLP",
};
let role = "OWNER";
let authenticated = true;
let sequence = 0;
const user = () => ({
  userId: location.businessId,
  membershipId: location.id,
  businessId: location.businessId,
  role,
  firstName: "Ana",
  lastName: "Demo",
});
const order = {
  id: "33333333-3333-4333-8333-333333abc120",
  locationId: location.id,
  type: "TAKEAWAY",
  status: "DRAFT",
  customerName: "Pedido anterior",
  createdAt: new Date().toISOString(),
  waiterId: null,
  items: [],
  billOrders: [],
};
const orders = [order];
const today = new Date().toISOString().slice(0, 10);
const shift = (offset) =>
  new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86400000)
    .toISOString()
    .slice(0, 10);
function dashboard(period) {
  const days = period === "today" ? 1 : period === "30d" ? 30 : 7;
  const management = ["OWNER", "ADMIN", "MANAGER"].includes(role);
  return {
    location,
    updatedAt: new Date().toISOString(),
    scope: role === "WAITER" ? "own" : "location",
    period: { key: period, days, from: shift(1 - days), to: today },
    orders: { total: 128, cancelled: 3, dineIn: 82, takeaway: 46 },
    live: {
      active: 14,
      drafts: 3,
      awaitingDelivery: 9,
      delivered: 2,
      paidTakeaway: 4,
      openSessions: 6,
      pendingPayments: 2,
      cancellationRequests: 0,
      invalidProducts: management ? 1 : null,
    },
    tables: {
      total: 12,
      occupied: 6,
      available: 4,
      reserved: 1,
      outOfService: 1,
    },
    timeline: Array.from({ length: days }, (_, i) => ({
      date: shift(i + 1 - days),
      sales: [134500, 185000, 142000, 231500, 198000, 258000, 201000][i % 7],
      orders: [14, 19, 16, 23, 18, 22, 16][i % 7],
    })),
    attentionOrders: [
      {
        id: order.id,
        code: "ABC120",
        label: "Mesa 04",
        type: "DINE_IN",
        status: "SENT",
        ageMinutes: 47,
        paid: false,
      },
      {
        id: "33333333-3333-4333-8333-333333abc121",
        code: "ABC121",
        label: "Retiro · Juan",
        type: "TAKEAWAY",
        status: "SENT",
        ageMinutes: 28,
        paid: true,
      },
      {
        id: "33333333-3333-4333-8333-333333abc122",
        code: "ABC122",
        label: "Mesa 08",
        type: "DINE_IN",
        status: "DELIVERED",
        ageMinutes: 19,
        paid: false,
      },
    ],
    cash:
      role === "WAITER"
        ? null
        : {
            open: true,
            openedAt: new Date().toISOString(),
            opener: "Camila Demo",
            expected: 184500,
            pendingHandovers: 2,
            pendingHandoverAmount: 35000,
          },
    finance: management
      ? {
          sales: 1350000,
          previousSales: 1174000,
          change: 15,
          tickets: 112,
          averageTicket: 12054,
          tips: 95600,
          discounts: 24300,
          collections: 1421300,
          reversals: 4500,
          outstanding: 86500,
          outstandingBills: 7,
          methods: [
            {
              method: "CASH",
              count: 34,
              collected: 402000,
              reversed: 4500,
              net: 397500,
            },
            {
              method: "CARD",
              count: 67,
              collected: 871800,
              reversed: 0,
              net: 871800,
            },
            {
              method: "TRANSFER",
              count: 11,
              collected: 152000,
              reversed: 0,
              net: 152000,
            },
          ],
          topProducts: [
            { id: "p1", name: "Hamburguesa de la casa", units: 84 },
            { id: "p2", name: "Papas rústicas", units: 61 },
            { id: "p3", name: "Limonada menta jengibre", units: 48 },
            { id: "p4", name: "Pizza margarita", units: 37 },
            { id: "p5", name: "Café americano", units: 29 },
          ],
        }
      : null,
  };
}

export const createFixtureServer = () =>
  http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && /^http:\/\/(127\.0\.0\.1|localhost):5189$/.test(origin))
      response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization,Content-Type",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    const url = new URL(request.url, "http://127.0.0.1:4319");
    let body = "";
    for await (const chunk of request) body += chunk;
    const send = (value) => response.end(JSON.stringify(value));
    if (url.pathname === "/__fixture/reset") {
      role = "OWNER";
      authenticated = true;
      sequence = 0;
      orders.splice(0, orders.length, order);
      return send({ ok: true });
    }
    if (url.pathname === "/__fixture/role") {
      role = url.searchParams.get("value") ?? "OWNER";
      authenticated = true;
      return send({ role });
    }
    if (url.pathname === "/auth/logout") {
      authenticated = false;
      return send({ message: "ok" });
    }
    if (url.pathname === "/auth/refresh") {
      if (!authenticated) response.statusCode = 401;
      return send(
        authenticated
          ? { accessToken: "synthetic-ui-fixture" }
          : { message: "Sin sesión" },
      );
    }
    if (url.pathname === "/auth/me") return send({ user: user() });
    if (url.pathname === "/locations") return send([location]);
    if (url.pathname === "/dashboard")
      return send(dashboard(url.searchParams.get("period") ?? "7d"));
    if (url.pathname === "/orders" && request.method === "POST") {
      sequence++;
      const created = {
        ...order,
        ...JSON.parse(body),
        id: `44444444-4444-4444-8444-444444abc1${String(sequence).padStart(2, "0")}`,
        createdAt: new Date().toISOString(),
        items: [],
        billOrders: [],
      };
      orders.unshift(created);
      return send(created);
    }
    if (url.pathname === "/orders") return send(orders);
    if (url.pathname.startsWith("/orders/"))
      return send(
        orders.find((item) => item.id === url.pathname.split("/")[2]) ?? order,
      );
    if (
      url.pathname.startsWith("/cash-sessions/") &&
      url.pathname.endsWith("/current")
    )
      return send({
        id: location.id,
        locationId: location.id,
        status: "OPEN",
        openedAt: new Date().toISOString(),
        openingAmount: 0,
        movements: [],
        handovers: [],
      });
    if (url.pathname === "/products")
      return send([
        {
          id: "55555555-5555-4555-8555-555555555555",
          locationId: location.id,
          name: "Producto de prueba",
          price: 5000,
          status: "ACTIVE",
          categoryId: null,
        },
      ]);
    return send([]);
  });
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  createFixtureServer().listen(4319, "127.0.0.1", () =>
    console.log("Synthetic UI fixture: http://127.0.0.1:4319"),
  );
}
