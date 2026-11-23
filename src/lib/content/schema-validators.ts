import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import { DIFFICULTY_META, type Difficulty, DIFFICULTIES } from "../curriculum";

type JsonSchema = Record<string, unknown>;

// `ajv/dist/2020` is CommonJS; normalise default-import interop across tsx/vitest/Next.
const AjvClass = ((Ajv2020 as unknown as { default?: typeof Ajv2020 }).default ?? Ajv2020) as typeof Ajv2020;

/**
 * The supplied canonical schema is the Beginner schema: it pins
 * `difficulty` to "beginner" and `id` to `^ANG-BEG-[0-9]{3}$`.
 *
 * We never fork or rewrite the file. For the other levels we derive an
 * in-memory variant that changes exactly those two constraints and nothing
 * else, so every other rule stays the supplied one.
 */
export function deriveSchemaForDifficulty(base: JsonSchema, difficulty: Difficulty): JsonSchema {
  const items = readPath(base, ["properties", "questions", "items", "properties"]) as
    | Record<string, JsonSchema>
    | undefined;
  const baseDifficulty = items?.difficulty?.const;

  if (!items || typeof baseDifficulty !== "string" || baseDifficulty === difficulty) {
    return base;
  }

  const clone = structuredClone(base);
  const cloneItems = readPath(clone, ["properties", "questions", "items", "properties"]) as Record<string, JsonSchema>;
  cloneItems.difficulty = { ...cloneItems.difficulty, const: difficulty };

  const basePrefix = DIFFICULTIES.includes(baseDifficulty as Difficulty)
    ? DIFFICULTY_META[baseDifficulty as Difficulty].idPrefix
    : null;
  const idSchema = cloneItems.id;
  if (basePrefix && typeof idSchema?.pattern === "string") {
    cloneItems.id = {
      ...idSchema,
      pattern: idSchema.pattern.replace(basePrefix, DIFFICULTY_META[difficulty].idPrefix),
    };
  }
  return clone;
}

function readPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export interface QuestionBatchValidators {
  /** Validate raw JSON against the (derived) canonical schema for a difficulty. */
  validate(difficulty: Difficulty, data: unknown): { valid: boolean; errors: ErrorObject[] };
  /** The base schema as supplied. */
  baseSchema: JsonSchema;
}

export function createBatchValidators(baseSchema: JsonSchema): QuestionBatchValidators {
  const ajv = new AjvClass({ allErrors: true, strict: false, allowUnionTypes: true });
  const cache = new Map<Difficulty, ValidateFunction>();

  function validatorFor(difficulty: Difficulty): ValidateFunction {
    let validator = cache.get(difficulty);
    if (!validator) {
      const schema = deriveSchemaForDifficulty(baseSchema, difficulty);
      // Distinct $id per variant so the compiled schemas never collide.
      validator = ajv.compile({ ...schema, $id: `question-batch/${difficulty}` });
      cache.set(difficulty, validator);
    }
    return validator;
  }

  return {
    baseSchema,
    validate(difficulty, data) {
      const validator = validatorFor(difficulty);
      const valid = validator(data) as boolean;
      return { valid, errors: valid ? [] : [...(validator.errors ?? [])] };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Readable Ajv error formatting                                               */
/* -------------------------------------------------------------------------- */

/** Convert an Ajv instancePath (`/questions/0/answer/tags`) to `questions[0].answer.tags`. */
export function instancePathToDisplay(instancePath: string): string {
  if (!instancePath) return "(root)";
  return instancePath
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((acc, segment) => (/^\d+$/.test(segment) ? `${acc}[${segment}]` : acc ? `${acc}.${segment}` : segment), "");
}

function valueAt(root: unknown, instancePath: string): unknown {
  if (!instancePath) return root;
  let current: unknown = root;
  for (const raw of instancePath.split("/").slice(1)) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function preview(value: unknown): string {
  if (value === undefined) return "undefined";
  const text = JSON.stringify(value);
  if (text === undefined) return String(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

export interface FormattedSchemaIssue {
  path: string;
  message: string;
  /** Index into `questions[]`, when the error is inside a question. */
  questionIndex?: number;
}

export function formatSchemaError(error: ErrorObject, root: unknown): FormattedSchemaIssue {
  const questionMatch = /^\/questions\/(\d+)/.exec(error.instancePath);
  const questionIndex = questionMatch ? Number(questionMatch[1]) : undefined;
  let path = instancePathToDisplay(error.instancePath);
  const found = valueAt(root, error.instancePath);
  let message: string;

  switch (error.keyword) {
    case "required": {
      const missing = String((error.params as { missingProperty: string }).missingProperty);
      path = path === "(root)" ? missing : `${path}.${missing}`;
      message = `missing required property "${missing}"`;
      break;
    }
    case "additionalProperties": {
      const extra = String((error.params as { additionalProperty: string }).additionalProperty);
      message = `unknown property "${extra}" is not allowed by the schema`;
      break;
    }
    case "const": {
      const allowed = (error.params as { allowedValue: unknown }).allowedValue;
      message =
        error.instancePath === "/schemaVersion"
          ? `unsupported schemaVersion ${preview(found)}; this platform supports ${preview(allowed)}`
          : `must equal ${preview(allowed)} (found ${preview(found)})`;
      break;
    }
    case "enum": {
      const allowed = (error.params as { allowedValues: unknown[] }).allowedValues;
      message = `must be one of ${allowed.map((v) => JSON.stringify(v)).join(", ")} (found ${preview(found)})`;
      break;
    }
    case "pattern": {
      const pattern = (error.params as { pattern: string }).pattern;
      message = `${preview(found)} does not match the required pattern ${pattern}`;
      break;
    }
    case "type": {
      const expected = (error.params as { type: string | string[] }).type;
      message = `must be ${Array.isArray(expected) ? expected.join(" or ") : expected} (found ${preview(found)})`;
      break;
    }
    case "minItems":
    case "maxItems": {
      const limit = (error.params as { limit: number }).limit;
      const count = Array.isArray(found) ? found.length : "?";
      message = `must have ${error.keyword === "minItems" ? "at least" : "at most"} ${limit} item(s) (found ${count})`;
      break;
    }
    default:
      message = error.message ?? `failed "${error.keyword}" validation`;
  }

  return { path, message, questionIndex };
}
