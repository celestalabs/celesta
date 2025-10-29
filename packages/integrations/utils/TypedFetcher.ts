export type TypedFetcher<
  R extends { success: true; code: number },
  Body extends object | undefined,
  Headers extends Record<string, string> | undefined = undefined,
  Params extends object | undefined = undefined,
> = (
  args: (Body extends undefined ? {} : { body: Body }) &
    (Headers extends undefined ? {} : { headers: Headers }) &
    (Params extends undefined ? {} : { params: Params })
) => Promise<R | { success: false; code: number; error: string }>;
