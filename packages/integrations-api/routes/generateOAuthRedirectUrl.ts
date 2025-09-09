import { isPieceName } from "../pieces/pieceName.ts";
import { getOAuthConfig } from "../utils/oAuth.ts";
import type { TypedFetcher } from "../utils/wrappedRouter.ts";

export type GenerateOAuthRedirectUrlHandler = TypedFetcher<
  /* Response */ { success: true; code: number; url: string },
  /* Body */ undefined,
  /* Headers */ undefined,
  /* Query Params */ {
    pieceName: string;
    redirectUrl: string;
    state: string;
  }
>;

export const GenerateOAuthRedirectUrlHandler: GenerateOAuthRedirectUrlHandler =
  async ({ params }) => {
    const { pieceName, redirectUrl, state } = params!;

    if (
      !isPieceName(pieceName) ||
      typeof redirectUrl !== "string" ||
      typeof state !== "string"
    ) {
      return {
        success: false,
        code: 400,
        error: "Missing/malformed required parameters",
      };
    }

    // Only get what is needed to build the link.
    const { clientId, authUrl, scope } = getOAuthConfig(pieceName) ?? {
      clientId: undefined,
      authUrl: undefined,
      clientSecret: undefined,
      scope: undefined,
    };

    if (clientId == null || authUrl == null) {
      return {
        success: false,
        code: 400,
        error: "No such OAuth configuration exists",
      };
    }

    const parameterizedUrl = new URL(authUrl);
    parameterizedUrl.searchParams.append("client_id", clientId);
    parameterizedUrl.searchParams.append("redirect_uri", redirectUrl);
    parameterizedUrl.searchParams.append("response_type", "code");
    parameterizedUrl.searchParams.append("state", state);
    if (scope) {
      scope.forEach((s) => parameterizedUrl.searchParams.append("scope", s));
    }

    return {
      success: true,
      code: 200,
      url: parameterizedUrl.toString(),
    };
  };
