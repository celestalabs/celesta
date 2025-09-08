import { isPieceName } from "../pieces/pieceName.ts";
import { pieceByName } from "../pieces/pieceData.ts";
import { isOAuth2PropertyValue } from "../utils/oAuth.ts";
import { type TypedFetcher } from "../utils/wrappedRouter.ts";

export type ExecuteIntegrationHandler = TypedFetcher<
  /* Response */ {
    success: true;
    code: 200;
    result: unknown;
  },
  /* Body */ {
    pieceName: string;
    action: string;
    props: object;
    // For simplicity, we only support OAuth2 for now.
    auth: { access_token: string };
  }
>;

export const ExecuteIntegrationHandler: ExecuteIntegrationHandler = async ({
  body,
}) => {
  const { pieceName, action, props, auth } = body;

  if (
    !isPieceName(pieceName) ||
    typeof action !== "string" ||
    typeof props !== "object" ||
    !isOAuth2PropertyValue(auth)
  ) {
    return {
      success: false,
      code: 400,
      error: "Invalid request body",
    };
  }

  const actionCtx = pieceByName[pieceName].getAction(action);

  if (!actionCtx) {
    return {
      success: false,
      code: 400,
      error: "No such action",
    };
  }

  const result = await actionCtx.run({
    propsValue: props,
    auth,
  } as any);

  return {
    success: true,
    code: 200,
    result,
  };
};
