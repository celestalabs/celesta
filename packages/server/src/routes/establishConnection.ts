import { generateId, type TypedFetcher } from "@celesta/common";
import { verifyAuthToken } from "../supabase.js";

export type EstablishConnectionResponse = {
  success: true;
  code: number;
  connectionCode: string;
  expiresAt: number;
  wsUrl: string;
};

export type EstablishConnectionHandler = TypedFetcher<
  EstablishConnectionResponse,
  undefined,
  { authorization: string },
  undefined
>;

// Store temporary connection codes: code -> { userId, expiresAt }
export const connectionCodes = new Map<
  string,
  { userId: string; expiresAt: number }
>();

// Clean up expired codes every minute
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of connectionCodes.entries()) {
    if (data.expiresAt < now) {
      connectionCodes.delete(code);
    }
  }
}, 60000);

export const EstablishConnectionHandler: EstablishConnectionHandler = async ({
  headers,
}) => {
  const token = headers.authorization.replace("Bearer ", "");

  if (!token) {
    return {
      success: false,
      code: 401,
      error: "No authentication token provided",
    };
  }

  // Verify the JWT token with Supabase
  const userId = await verifyAuthToken(token);

  if (!userId) {
    return {
      success: false,
      code: 401,
      error: "Invalid authentication token",
    };
  }

  // Generate a temporary connection code
  const connectionCode = generateId("CONN");
  const expiresAt = Date.now() + 30000; // 30 seconds to use the code

  connectionCodes.set(connectionCode, { userId, expiresAt });

  console.log(
    `Connection code generated for user ${userId}: ${connectionCode}`
  );

  return {
    success: true,
    code: 200,
    connectionCode,
    expiresAt,
    wsUrl: `ws://localhost:${process.env.PORT || 8080}`,
  };
};
