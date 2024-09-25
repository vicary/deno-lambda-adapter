import { env, type Env } from "./env.ts";

declare const Bun:
  | {
      serve: (options: {
        fetch: (request: Request) => Promisable<Response>;
      }) => {
        stop: (closeActiveConnections?: boolean) => void;
      };
    }
  | undefined;

declare const process:
  | {
      env: Env;
      exit: (exitCode?: number) => void;
      on: (event: string, listener: () => void) => void;
      versions?: {
        node: string;
      };
    }
  | undefined;

type Promisable<T> = T | Promise<T>;

type ReqeustHandler = (request: Request, env: Env) => Promisable<Response>;

type Shutdown = () => Promisable<void>;

type CloudFlareFetchEvent = {
  /* [MDN Reference](https://developer.mozilla.org/docs/Web/API/FetchEvent/request) */
  readonly request: Request;
  /* [MDN Reference](https://developer.mozilla.org/docs/Web/API/FetchEvent/respondWith) */
  respondWith(promise: Response | Promise<Response>): void;
};

export const onStart = async (handler: ReqeustHandler): Promise<Shutdown> => {
  const envObj = env();

  // Bun
  if (typeof Bun !== "undefined") {
    const server = Bun.serve({
      fetch: (request) => handler(request, envObj),
    });

    return () => server.stop();
  }
  // Deno
  else if (typeof Deno !== "undefined") {
    const server = Deno.serve((request) => handler(request, envObj));

    return () => server.shutdown();
  }
  // Node
  else if (typeof process !== "undefined" && process.versions?.node) {
    const gracefulTimeout = 10000;
    const http = await import("node:http");
    const server = http
      .createServer(async (request, response) => {
        const result = await handler(
          new Request(request.url!, {
            method: request.method,
            headers: new Headers(
              Object.entries(request.headers)
                .filter(([, v]) => !!v)
                .map(([k, v]) => [
                  k,
                  Array.isArray(v) ? v.join(", ") : (v as string),
                ])
            ),
            body: ReadableStream.from(request),
          }),
          envObj
        );

        response.writeHead(result.status, Object.fromEntries(result.headers));
        response.end(await result.text());
      })
      .listen();

    return async () => {
      server.close();

      const gracefulUntil = Date.now() + gracefulTimeout;

      while (server.connections > 0 && Date.now() < gracefulUntil) {
        await new Promise((r) => setTimeout(r, 100));
      }

      if (server.connections > 0) {
        server.closeAllConnections();
      }
    };
  }
  // CloudFlare Workers
  else if (typeof globalThis.addEventListener === "function") {
    const eventListener = async (event: Event) => {
      const typedEvent = event as unknown as CloudFlareFetchEvent;

      typedEvent.respondWith(await handler(typedEvent.request, envObj));
    };

    addEventListener("fetch", eventListener);

    return () => {
      removeEventListener("fetch", eventListener);
    };
  } else {
    throw new Error("Unsupported runtime");
  }
};

export const onStop = (shutdown: Shutdown): void => {
  // Deno
  if (typeof Deno !== "undefined") {
    Deno.addSignalListener("SIGTERM", async () => {
      await shutdown();

      Deno.exit();
    });
  }
  // Node
  else if (typeof process !== "undefined") {
    process.on("SIGTERM", async () => {
      await shutdown();

      process.exit();
    });
  } else {
    throw new Error("Unsupported runtime");
  }
};
