import express from "express";
import cors from "cors";
import axios from "axios";
import { googleDrive, googleDriveAuth } from "@activepieces/piece-google-drive";
import {
  getClientIdByPieceName,
  getClientSecretByPieceName,
} from "./secrets.ts";
import { isPieceName } from "./pieceName.ts";
import { pieceAuthByName } from "./pieceData.ts";

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
app.get("/", (req, res) => {
  res.send("OAuth Server for Celesta Extension");
});

app.get("/api/getOAuthUrl", (req, res) => {
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

// Token refresh endpoint
app.post("/api/oauth/refresh", async (req, res) => {
  try {
    const { refreshToken, provider } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Missing refresh token" });
    }

    // Get OAuth configuration based on provider
    const config = getOAuthConfig(provider);
    if (!config) {
      return res.status(400).json({ error: "Invalid or unsupported provider" });
    }

    if (!config.clientId || !config.clientSecret || !config.authUrl) {
      return res.status(400).json({ error: "Incomplete OAuth configuration" });
    }

    // Exchange refresh token for new access token
    const tokenResponse = await axios({
      method: "post",
      url: config.authUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    });

    // Return new tokens to client
    return res.json({
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token || refreshToken, // Some providers don't include a new refresh token
      expiresIn: tokenResponse.data.expires_in,
      tokenType: tokenResponse.data.token_type,
    });
  } catch (error) {
    const typedError = error as { response?: { data: any }; message?: string };
    console.error(
      "Token refresh error:",
      typedError.response?.data || typedError.message
    );
    return res.status(500).json({
      error: "Failed to refresh tokens",
      details: typedError.response?.data || typedError.message,
    });
  }
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
