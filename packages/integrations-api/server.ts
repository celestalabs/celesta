import cors from "cors";
import express from "express";
import { ExecuteIntegrationHandler } from "./routes/executeIntegration.ts";
import { GenerateOAuthAccessTokenHandler } from "./routes/generateOAuthAccessToken.ts";
import { GenerateOAuthRedirectUrlHandler } from "./routes/generateOAuthRedirectUrl.ts";
import { ListIntegrationsHandler } from "./routes/listIntegrations.ts";
import { WrappedRouter } from "./utils/wrappedRouter.ts";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  "/api",
  new WrappedRouter(express.Router())
    .route("post", "/executeIntegration", ExecuteIntegrationHandler)
    .route("post", "/generateOAuthAccessToken", GenerateOAuthAccessTokenHandler)
    .route("get", "/generateOAuthRedirectUrl", GenerateOAuthRedirectUrlHandler)
    .route("get", "/listIntegrations", ListIntegrationsHandler)
    .unwrap()
);

const PORT = process.env.PORT || 8080;

export const run = () =>
  app.listen(PORT, () => {
    console.log(`OAuth server running on http://localhost:${PORT}`);
  });
