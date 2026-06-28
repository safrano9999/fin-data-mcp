import { z } from "zod";

/** MCP tool behavior hints (see MCP spec). */
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * Uniform shape for every tool a provider exposes. `inputSchema` is a Zod raw
 * shape (object of Zod schemas) so the MCP SDK can derive the JSON Schema and
 * validate args before the handler runs.
 */
export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  annotations: ToolAnnotations;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Sensible defaults: every tool in this server reads external data and has no
 * side effects, so they are read-only, non-destructive, idempotent and
 * open-world. Individual tools can override via `annotations`.
 */
const DEFAULT_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

/** Type-safe helper that infers handler args from the input schema shape. */
export function tool<S extends z.ZodRawShape>(def: {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  annotations?: ToolAnnotations;
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}): ToolDef {
  return {
    ...def,
    annotations: { ...DEFAULT_ANNOTATIONS, ...def.annotations },
  } as unknown as ToolDef;
}
