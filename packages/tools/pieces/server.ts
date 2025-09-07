import express from "express";
import cors from "cors";
import axios from "axios";
import {
  getClientIdByPieceName,
  getClientSecretByPieceName,
} from "./secrets.ts";
import { isPieceName } from "./pieceName.ts";
import { pieceAuthByName, pieceByName } from "./pieceData.ts";
import {
  createAction,
  OAuth2PropertyValue,
} from "@activepieces/pieces-framework";

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration - only allow requests from the extension
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple home page
app.get("/", (_req, res) => {
  res.send("OAuth Server for Celesta Extension");
});

// Redirects to the OAuth flow URL
app.get("/api/oauth/redirect", (req, res) => {
  const { pieceName, redirectUrl, state } = req.query;

  console.log("Received", { pieceName, redirectUrl, state });

  if (
    !isPieceName(pieceName) ||
    typeof redirectUrl !== "string" ||
    typeof state !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Missing/malformed required parameters" });
  }

  // Only get what is needed to build the link.
  const { clientId, authUrl, scope } = getOAuthConfig(pieceName) ?? {
    clientId: undefined,
    authUrl: undefined,
    clientSecret: undefined,
    scope: undefined,
  };

  console.log("Found", { clientId, authUrl });

  if (clientId == null || authUrl == null) {
    return res
      .status(400)
      .json({ error: "No such OAuth configuration exists" });
  }

  const parameterizedUrl = new URL(authUrl);
  parameterizedUrl.searchParams.append("client_id", clientId);
  parameterizedUrl.searchParams.append("redirect_uri", redirectUrl);
  parameterizedUrl.searchParams.append("response_type", "code");
  parameterizedUrl.searchParams.append("state", state);
  if (scope) {
    scope.forEach((s) => parameterizedUrl.searchParams.append("scope", s));
  }

  console.log(parameterizedUrl.toString());
  res.redirect(parameterizedUrl.toString());
});

// OAuth token exchange endpoint
app.post("/api/oauth/token", async (req, res) => {
  try {
    const { code, redirectUri, pieceName } = req.body;

    if (!code || !redirectUri || !isPieceName(pieceName)) {
      return res
        .status(400)
        .json({ error: "Missing/malformed required parameters" });
    }

    // Get OAuth configuration based on provider
    const config = getOAuthConfig(pieceName);
    if (!config) {
      return res.status(400).json({ error: "Invalid or unsupported provider" });
    }

    // Exchange authorization code for tokens
    if (!config.clientId || !config.clientSecret || !config.tokenUrl) {
      return res.status(400).json({ error: "Incomplete OAuth configuration" });
    }

    const tokenResponse = await axios({
      method: "post",
      url: config.tokenUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    console.log(tokenResponse.status);

    // Return tokens to client
    console.log(config.tokenUrl, {
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
    });
    const response = {
      accessToken: tokenResponse.data.access_token,
      expiresIn: tokenResponse.data.expires_in,
      tokenType: tokenResponse.data.token_type,
    };
    console.log(response);
    return res.json(response);
  } catch (error) {
    const typedError = error as { response?: { data: any }; message?: string };
    console.error(
      "Token exchange error:",
      typedError.response?.data || typedError.message
    );
    return res.status(500).json({
      error: "Failed to exchange authorization code for tokens",
      details: typedError.response?.data || typedError.message,
    });
  }
});

function isOAuth2PropertyValue(
  something: unknown
): something is OAuth2PropertyValue {
  return (
    typeof something === "object" &&
    something !== null &&
    "access_token" in something &&
    typeof something.access_token === "string"
  );
}

app.post("/api/tool/execute-oauth", async (req, res) => {
  const { pieceName, action, props, auth } = req.body;

  if (
    !isPieceName(pieceName) ||
    typeof action !== "string" ||
    typeof props !== "object" ||
    !isOAuth2PropertyValue(auth)
  ) {
    return res.status(400).json({ error: "Malformed request body" });
  }

  pieceByName[pieceName].getAction(action)?.run({
    propsValue: props,
    auth,
  } as any);
});

function getOAuthConfig(provider: string): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authUrl: string | undefined;
  tokenUrl: string | undefined;
  scope: string[] | undefined;
} | null {
  const normalizedProvider = provider.toLowerCase();

  if (!isPieceName(normalizedProvider)) {
    return null;
  }

  const pieceAuth = pieceAuthByName[normalizedProvider];
  const clientId = getClientIdByPieceName(normalizedProvider);
  const clientSecret = getClientSecretByPieceName(normalizedProvider);

  if (!pieceAuth || !clientId || !clientSecret) {
    return null;
  }

  return {
    ...pieceAuth,
    clientId,
    clientSecret,
  };
}

export const run = () =>
  app.listen(PORT, () => {
    console.log(`OAuth server running on http://localhost:${PORT}`);
  });
