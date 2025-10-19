# @celesta/integrations-api

A **REST API server that acts as a bridge between Celesta and real third-party integrations**. It provides OAuth authentication flows and tool execution capabilities for Google services (Gmail, Calendar, Drive, Contacts) and custom integrations.

## Overview

This package abstracts away the complexity of OAuth2 flows and integration execution, providing a unified API for the Celesta extension to interact with external services.

**Key Features**:
- OAuth2 authentication proxy (handles consent flows and token exchange)
- Unified API for executing actions across multiple integrations
- Built on [Activepieces](https://www.activepieces.com/) for pre-built, maintained integration implementations
- Type-safe client SDK for browser extension usage
- Dynamic integration metadata and JSON Schema generation
- Secure credential management (OAuth secrets stored server-side)

**Technology Stack**:
- **Express.js** (v5.1.0) - HTTP server framework
- **Activepieces** - Pre-built integration implementations
- **Axios** - HTTP client for OAuth token exchanges
- **Zod** (v4.1.5) - Schema validation and JSON Schema generation
- **CORS** - Cross-origin requests enabled

---

## API Routes

### **1. Execute Integration**

Execute actions on integrated services (send email, create calendar event, etc.)

**Endpoint**: `POST /api/executeIntegration`

**Request**:
```json
{
  "integrationName": "gmail",
  "actionName": "send_email",
  "props": {
    "to": "user@example.com",
    "subject": "Hello",
    "body": "World"
  },
  "auth": {
    "access_token": "ya29.a0AfH6..."
  }
}
```

**Response**:
```json
{
  "success": true,
  "code": 200,
  "result": {
    "messageId": "abc123...",
    "status": "sent"
  }
}
```

**Supported Integrations**:
- `gmail` - Email management (requires OAuth)
- `google_calendar` - Calendar events (requires OAuth)
- `google_drive` - File storage (requires OAuth)
- `google_contacts` - Contact management (requires OAuth)
- `web_search` - AI-powered web search (server-side API key)

---

### **2. Generate OAuth Redirect URL**

Generate the OAuth consent screen URL for user authorization.

**Endpoint**: `GET /api/generateOAuthRedirectUrl`

**Query Parameters**:
- `pieceName` (string, required) - Integration name (e.g., "gmail")
- `redirectUrl` (string, required) - Where to redirect after authorization
- `state` (string, required) - CSRF protection token

**Example**:
```
GET /api/generateOAuthRedirectUrl?pieceName=gmail&redirectUrl=https://ext.example.com/callback&state=random_state_123
```

**Response**:
```json
{
  "success": true,
  "code": 200,
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&state=...&scope=..."
}
```

**Usage Flow**:
1. Call this endpoint to get the OAuth consent URL
2. Open the URL in a browser/popup
3. User authorizes the application
4. User is redirected to `redirectUrl` with authorization code

---

### **3. Generate OAuth Access Token**

Exchange authorization code for access token.

**Endpoint**: `POST /api/generateOAuthAccessToken`

**Request**:
```json
{
  "code": "4/0AfJoh...",
  "redirectUri": "https://ext.example.com/callback",
  "pieceName": "gmail"
}
```

**Response**:
```json
{
  "success": true,
  "code": 200,
  "accessToken": "ya29.a0AfH6...",
  "expiresIn": 3599,
  "tokenType": "Bearer"
}
```

**Notes**:
- The `redirectUri` must exactly match the one used in the authorization request
- Access tokens typically expire after 1 hour
- Store tokens securely (e.g., encrypted storage)

---

### **4. List Integrations**

Return metadata for all available integrations (for UI generation and discovery).

**Endpoint**: `GET /api/listIntegrations`

**Response**:
```json
{
  "success": true,
  "code": 200,
  "integrations": {
    "gmail": {
      "name": "Gmail",
      "description": "Send and manage emails",
      "logoUrl": "https://...",
      "actions": [
        {
          "name": "send_email",
          "description": "Send an email",
          "props": {
            "type": "object",
            "properties": {
              "to": { "type": "string", "description": "..." },
              "subject": { "type": "string", "description": "..." },
              "body": { "type": "string", "description": "..." }
            },
            "required": ["to", "subject", "body"]
          }
        }
      ]
    }
  }
}
```

**Features**:
- Results are cached in memory after first request
- Action props are returned as JSON Schema for dynamic UI generation
- Includes all available integrations (both Piece and custom)

---

## Client SDK

Type-safe client for calling the integrations API from JavaScript/TypeScript applications.

### **Installation & Setup**

```typescript
import { createIntegrationApiClient } from "@celesta/integrations-api/client";

const client = createIntegrationApiClient("http://localhost:8080");
```

### **Usage Examples**

#### **Generate OAuth URL**
```typescript
const { url } = await client.generateOAuthRedirectUrl({
  params: {
    pieceName: "gmail",
    redirectUrl: "https://myapp.com/oauth/callback",
    state: "random_csrf_token_123"
  }
});

// Open the URL in a browser window
window.open(url, "_blank");
```

#### **Exchange Code for Token**
```typescript
const { accessToken, expiresIn } = await client.generateOAuthAccessToken({
  body: {
    code: "4/0AfJoh...",
    redirectUri: "https://myapp.com/oauth/callback",
    pieceName: "gmail"
  }
});

// Store the access token securely
localStorage.setItem("gmail_token", accessToken);
```

#### **Execute Integration Action**
```typescript
const result = await client.executeIntegration({
  body: {
    integrationName: "gmail",
    actionName: "send_email",
    props: {
      to: "user@example.com",
      subject: "Meeting Tomorrow",
      body: "Don't forget our meeting at 2pm!"
    },
    auth: {
      access_token: localStorage.getItem("gmail_token")
    }
  }
});

if (result.success) {
  console.log("Email sent:", result.result);
}
```

#### **List Available Integrations**
```typescript
const { integrations } = await client.listIntegrations({});

// Display integrations in UI
Object.entries(integrations).forEach(([id, integration]) => {
  console.log(`${integration.name}: ${integration.description}`);
  integration.actions.forEach(action => {
    console.log(`  - ${action.name}: ${action.description}`);
  });
});
```

## Environment Variables

Create a `.env` file in the `packages/integrations-api/` directory:

```bash
# Google OAuth Credentials
# Get these from https://console.cloud.google.com/apis/credentials
TOOL_GOOGLE_CLIENT_ID=your_google_oauth_client_id
TOOL_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Server Port (optional, defaults to 8080)
PORT=8080
```

## Setup & Usage

### **Install Dependencies**
```bash
npm install
```

### **Start Server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:8080` (or your specified PORT).
