export type SuccessResponse<Success extends object> =
  | ({ success: true } & Success)
  | { success: false; error: string };
