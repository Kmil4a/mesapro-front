import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { createFixtureServer } from "./ui-fixture.mjs";

test(
  "dashboard y navegación con sesión y pedidos sintéticos",
  { timeout: 90000 },
  async (t) => {
    const api = createFixtureServer().listen(0, "127.0.0.1");
    await once(api, "listening");
    const apiUrl = `http://127.0.0.1:${api.address().port}`;
    const dom = new JSDOM(
      '<!doctype html><html><body><div id="root"></div></body></html>',
      { url: "http://localhost/dashboard", pretendToBeVisual: true },
    );
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: dom.window.navigator,
    });
    globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        width: 600,
        height: 256,
        top: 0,
        left: 0,
        right: 600,
        bottom: 256,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      };
    };
    dom.window.HTMLElement.prototype.scrollIntoView = function () {};
    dom.window.HTMLElement.prototype.scrollTo = function () {};
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
      mode: "test",
      define: { "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl) },
    });
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { act, createElement: h } = React;
    const { BrowserRouter } = await import("react-router-dom");
    const { QueryClient, QueryClientProvider } =
      await import("@tanstack/react-query");
    const { AuthProvider } = await vite.ssrLoadModule(
      "/src/auth/AuthContext.tsx",
    );
    const { LocationProvider } = await vite.ssrLoadModule(
      "/src/context/LocationContext.tsx",
    );
    const { AppDialogProvider } = await vite.ssrLoadModule(
      "/src/components/ui/AppDialog.tsx",
    );
    const { AppRouter } = await vite.ssrLoadModule("/src/router/AppRouter.tsx");
    let root;
    let client;
    const until = async (condition, label) => {
      for (let i = 0; i < 100; i++) {
        if (condition()) {
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 30));
          });
          return;
        }
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 25));
        });
      }
      throw new Error(
        `No se observó ${label}. URL: ${window.location.href}. Texto: ${document.body.textContent.slice(0, 500)}`,
      );
    };
    async function unmount() {
      if (root) {
        await act(async () => root.unmount());
        root = null;
      }
      client?.clear();
    }
    async function mount(path) {
      await unmount();
      window.history.replaceState({}, "", path);
      client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      root = createRoot(document.getElementById("root"));
      await act(async () =>
        root.render(
          h(
            QueryClientProvider,
            { client },
            h(
              BrowserRouter,
              null,
              h(
                AuthProvider,
                null,
                h(
                  LocationProvider,
                  null,
                  h(AppDialogProvider, null, h(AppRouter)),
                ),
              ),
            ),
          ),
        ),
      );
    }
    const button = (text) =>
      [...document.querySelectorAll("button")].find(
        (element) => element.textContent.trim() === text,
      );
    const click = async (element) => {
      assert.ok(element, "Control encontrado");
      await act(async () =>
        element.dispatchEvent(
          new window.MouseEvent("click", { bubbles: true }),
        ),
      );
    };
    try {
      await t.test(
        "sesión autenticada no muestra login y carga indicadores",
        async () => {
          await act(async () => {
            await fetch(`${apiUrl}/__fixture/reset`);
          });
          await mount("/login");
          await until(
            () =>
              window.location.pathname === "/dashboard" &&
              document.body.textContent.includes("Ventas netas"),
            "dashboard autenticado",
          );
          assert.ok(!document.querySelector("input[type=password]"));
          assert.ok(
            document.body.textContent.includes("Productos más vendidos"),
          );
          await click(button("30 días"));
          await until(
            () =>
              document.body.textContent.includes(
                "los 30 días anteriores completos",
              ),
            "período de dashboard",
          );
        },
      );
      await t.test(
        "crear desde otro pedido conserva el nuevo detalle y su URL",
        async () => {
          await mount("/pedidos?order=33333333-3333-4333-8333-333333abc120");
          await until(
            () => document.body.textContent.includes("Pedido anterior"),
            "pedido anterior",
          );
          await click(button("Nuevo pedido"));
          await click(button("Para llevar"));
          const input = document.querySelector(
            'input[placeholder="Ej. Daniela"]',
          );
          assert.ok(input);
          await act(async () => {
            Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value",
            ).set.call(input, "Cliente nuevo de prueba");
            input.dispatchEvent(new window.Event("input", { bubbles: true }));
          });
          const form = button("Crear pedido").closest("form");
          await act(async () =>
            form.dispatchEvent(
              new window.Event("submit", { bubbles: true, cancelable: true }),
            ),
          );
          await until(
            () =>
              window.location.search.includes("44444444") &&
              document.body.textContent.includes("Cliente nuevo de prueba"),
            "pedido recién creado",
          );
          const newUrl = window.location.pathname + window.location.search;
          assert.ok(
            newUrl.includes("order=44444444-4444-4444-8444-444444abc101"),
          );
          assert.ok(!document.body.textContent.includes("Pedido anterior"));
          await mount(newUrl);
          await until(
            () => document.body.textContent.includes("Cliente nuevo de prueba"),
            "pedido después de recargar",
          );
        },
      );
      await t.test(
        "cajero autenticado vuelve a caja al intentar abrir login",
        async () => {
          await act(async () => {
            await fetch(`${apiUrl}/__fixture/role?value=CASHIER`);
          });
          await mount("/login");
          await until(
            () => window.location.pathname === "/caja",
            "inicio del cajero",
          );
          assert.ok(!document.querySelector("input[type=password]"));
        },
      );
      await t.test("sin sesión sí se permite abrir el login", async () => {
        await act(async () => {
          await fetch(`${apiUrl}/auth/logout`, { method: "POST" });
        });
        await mount("/login");
        await until(
          () => !!document.querySelector("input[type=password]"),
          "formulario de login",
        );
        assert.equal(window.location.pathname, "/login");
      });
    } finally {
      await unmount();
      await vite.close();
      api.closeAllConnections();
      await new Promise((resolve) => api.close(resolve));
      dom.window.close();
    }
  },
);
