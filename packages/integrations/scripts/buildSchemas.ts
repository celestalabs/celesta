import { jsonSchemaToZod } from "json-schema-to-zod";
import { ListIntegrationsHandler } from "../routes/listIntegrations.ts";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMAS_DIR = path.join(__dirname, "..", "schemas");

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

async function buildSchemas() {
  console.log("Building schemas for all integrations...");

  // Helper to sanitize identifiers (replace hyphens with underscores)
  const sanitizeIdentifier = (name: string) => name.replace(/-/g, "_");

  const rawIntegrationsResponse = await ListIntegrationsHandler({
    params: {},
  });

  if (!rawIntegrationsResponse.success) {
    console.error("Failed to fetch integrations");
    process.exit(1);
  }

  const integrations = rawIntegrationsResponse.integrations;
  let totalActions = 0;
  const allSchemas: {
    key: string;
    integrationName: string;
    actionName: string;
  }[] = [];

  // Ensure base schemas directory exists
  await ensureDirectoryExists(SCHEMAS_DIR);

  // Iterate through each integration
  for (const [integrationName, integrationData] of Object.entries(
    integrations
  )) {
    console.log(`\nProcessing integration: ${integrationName}`);

    if (!integrationData.actions || integrationData.actions.length === 0) {
      console.log(`  No actions found for ${integrationName}`);
      continue;
    }

    // Create integration directory
    const integrationDir = path.join(SCHEMAS_DIR, integrationName);
    await ensureDirectoryExists(integrationDir);

    // Process each action
    for (const action of integrationData.actions) {
      try {
        const actionName = action.name;
        const sanitizedActionName = sanitizeIdentifier(actionName);
        console.log(`  - Generating schema for action: ${actionName}`);

        // Convert JSON schema to Zod
        const zodSchemaCode = jsonSchemaToZod(action.props, { module: "esm" });

        // Extract the actual schema code (after the import and export default)
        // jsonSchemaToZod returns: "import { z } from "zod"\n\nexport default [schema]"
        const lines = zodSchemaCode.split("\n");
        const schemaStartIndex = lines.findIndex((line) =>
          line.includes("export default")
        );
        const schemaCode = lines
          .slice(schemaStartIndex)
          .join("\n")
          .replace("export default ", "");

        // Create the file content with proper imports and exports
        // Use sanitized action name for valid JavaScript identifiers
        const fileContent = `// Auto-generated schema for ${integrationName}.${actionName}
// Generated on: ${new Date().toISOString()}

import { z } from "zod";

export const ${sanitizedActionName}Schema = ${schemaCode.trim()};

export type ${sanitizedActionName}Input = z.infer<typeof ${sanitizedActionName}Schema>;
`;

        // Write to file
        const filePath = path.join(integrationDir, `${actionName}.ts`);
        await fs.writeFile(filePath, fileContent, "utf-8");

        // Track this schema for the master index
        allSchemas.push({
          key: `${integrationName}__${actionName}`,
          integrationName,
          actionName,
        });

        totalActions++;
      } catch (error) {
        console.error(
          `  ERROR: Failed to generate schema for ${integrationName}.${action.name}:`,
          error
        );
      }
    }

    // Create an index file for the integration
    const indexContent = integrationData.actions
      .map((action) => `export * from "./${action.name}.ts";`)
      .join("\n");

    await fs.writeFile(
      path.join(integrationDir, "index.ts"),
      indexContent + "\n",
      "utf-8"
    );
  }

  // Create master index.ts file
  console.log("\nGenerating master index file...");

  const masterIndexImports = allSchemas
    .map(({ integrationName, actionName }) => {
      const sanitizedAction = sanitizeIdentifier(actionName);
      const sanitizedIntegration = sanitizeIdentifier(integrationName);
      return `import { ${sanitizedAction}Schema as ${sanitizedIntegration}__${sanitizedAction}Schema } from "./${integrationName}/${actionName}.ts";`;
    })
    .join("\n");

  const masterIndexRecord = allSchemas
    .map(({ key, integrationName, actionName }) => {
      const sanitizedAction = sanitizeIdentifier(actionName);
      const sanitizedIntegration = sanitizeIdentifier(integrationName);
      return `  "${key}": ${sanitizedIntegration}__${sanitizedAction}Schema`;
    })
    .join(",\n");

  const masterIndexContent = `// Auto-generated master index for all integration schemas
// Generated on: ${new Date().toISOString()}
// Total schemas: ${totalActions}

import { z } from "zod";
${masterIndexImports}

export const allIntegrationSchemas: Record<string, z.ZodTypeAny> = {
${masterIndexRecord}
};

export type IntegrationSchemaKey = keyof typeof allIntegrationSchemas;
`;

  await fs.writeFile(
    path.join(SCHEMAS_DIR, "index.ts"),
    masterIndexContent,
    "utf-8"
  );

  console.log(
    `\n✓ Successfully generated ${totalActions} schema files for ${Object.keys(integrations).length} integrations`
  );
  console.log(`  Output directory: ${SCHEMAS_DIR}`);
  console.log(`  Master index: ${path.join(SCHEMAS_DIR, "index.ts")}`);
}

buildSchemas().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
