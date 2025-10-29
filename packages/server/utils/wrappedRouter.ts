import { TypedFetcher } from "@celesta/integrations";
import type { Router } from "express";

export class WrappedRouter {
  private router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  route<
    R extends { success: true; code: number },
    Body extends object | undefined,
    Headers extends Record<string, string> | undefined,
    Params extends object | undefined,
  >(
    method: "get" | "post",
    path: string,
    handler: TypedFetcher<R, Body, Headers, Params>
  ) {
    this.router[method](path, async (req, res) => {
      try {
        console.log("Request received:", {
          method,
          path,
          body: req.body,
          headers: req.headers,
          params: req.query,
        });

        const result = await handler({
          body: req.body as Body,
          headers: req.headers as Headers,
          params: req.query as Params,
        } as unknown as (Body extends undefined ? {} : { body: Body }) &
          (Headers extends undefined ? {} : { headers: Headers }) &
          (Params extends undefined ? {} : { params: Params }));
        res.status(result.code).json(result);
      } catch (e) {
        console.error(e);
        res
          .status(500)
          .json({ success: false, error: "Internal Server Error" + e });
      }
    });

    return this;
  }

  unwrap() {
    return this.router;
  }
}

export const defineConfigure =
  (configure: (app: WrappedRouter) => void) => (app: WrappedRouter) =>
    configure(app);
