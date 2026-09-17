/*!
 * type-is
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

import { parse, isTypeValid, isTokenValid, ContentType } from "content-type";

/**
 * Node.js HTTP request shape.
 */
export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Check if a request has a request body. A request with a body must either have
 * `transfer-encoding` or `content-length` headers set.
 */
export function hasBody(req: RequestLike): boolean {
  return (
    req.headers["transfer-encoding"] !== undefined ||
    !Number.isNaN(Number(req.headers["content-length"]))
  );
}

/**
 * The default behavior of `lookup` handles only a few common shorthands.
 */
export function DEFAULT_LOOKUP(value: string): string | string[] | undefined {
  switch (value) {
    case "urlencoded":
      return "application/x-www-form-urlencoded";
    case "multipart":
      return "multipart/*";
    case "json":
      return "application/json";
    default:
      return undefined;
  }
}

export interface NormalizeOptions {
  lookup?: (value: string) => string | string[] | undefined;
}

/**
 * Normalize MIME type by:
 *
 * - If the string contains a `/`, then it is returned as the type.
 * - If the string starts with `+` (so it is a `+suffix` shorthand like `+json`), then it is expanded to contain the complete wildcard notation of `*\/*+suffix`.
 * - Else the string is assumed to be a file extension and the mapped media type is returned, or the original input if there is no mapping.
 */
export function normalize(
  value: string,
  options?: NormalizeOptions,
): string | string[] {
  if (value.includes("/")) return value;
  if (value.startsWith("+")) return `*/*${value}`;
  const lookup = options?.lookup ?? DEFAULT_LOOKUP;
  return lookup(value) ?? value;
}

/**
 * Compile an expected mime type into a reusable matcher.
 */
export function match(expected: string): (actual: string) => boolean {
  const expectedSlash = expected.indexOf("/");

  if (expectedSlash === -1 || !isTypeValid(expected)) {
    throw new TypeError(`Invalid mime type: ${expected}`);
  }

  const type = expected.slice(0, expectedSlash);
  let subtype = expected.slice(expectedSlash + 1);
  let suffix = "";

  if (subtype.startsWith("*+")) {
    suffix = subtype.slice(1);
    subtype = "*";
  }

  if (type === "*" && subtype === "*") {
    if (!suffix) return (actual: string) => isTypeValid(actual);

    return (actual: string) => {
      return (
        actual.charAt(actual.length - suffix.length - 1) !== "/" &&
        actual.endsWith(suffix) &&
        isTypeValid(actual)
      );
    };
  }

  if (type === "*") {
    return (actual: string) => {
      return (
        actual.charAt(actual.length - subtype.length - 1) === "/" &&
        actual.endsWith(subtype) &&
        isTokenValid(actual, 0, actual.length - subtype.length - 1)
      );
    };
  }

  if (subtype === "*") {
    return (actual: string) => {
      return (
        actual.charAt(type.length) === "/" &&
        actual.startsWith(type) &&
        actual.endsWith(suffix) &&
        isTokenValid(actual, type.length + 1, actual.length - suffix.length)
      );
    };
  }

  return (actual: string): boolean => actual === expected;
}

interface Pattern {
  key: string;
  match: (value: string) => boolean;
  parameters: Record<string, string>;
  hasParameters: boolean;
}

export type ParameterValue = (key: string, value: string) => string;

/**
 * Normalize a parameter value for comparison.
 */
export function DEFAULT_PARAMETER_VALUE(key: string, value: string): string {
  if (key === "charset") return value.toLowerCase();
  return value;
}

export interface TypeIsOptions extends NormalizeOptions {
  parameterValue?: ParameterValue;
}

export class TypeIs {
  private readonly hasParameters: boolean = false;
  private readonly patterns: Pattern[] = [];
  private readonly parameterValue: ParameterValue;

  /**
   * Compile a list of expected mime types into a reusable matcher.
   */
  constructor(types: readonly string[], options?: TypeIsOptions) {
    this.parameterValue = options?.parameterValue ?? DEFAULT_PARAMETER_VALUE;

    for (const t of types) {
      const contentType = parse(t);
      const hasParameters = Object.keys(contentType.parameters).length > 0;
      const type = normalize(contentType.type, options);
      const parameters = contentType.parameters;

      // Normalize parameter values before comparison.
      for (const key of Object.keys(parameters)) {
        parameters[key] = this.parameterValue(key, parameters[key]);
      }

      this.hasParameters ||= hasParameters;

      if (Array.isArray(type)) {
        for (const t of type) {
          this.patterns.push({
            key: t,
            match: match(t),
            parameters,
            hasParameters,
          });
        }
      } else {
        this.patterns.push({
          key: type,
          match: match(type),
          parameters,
          hasParameters,
        });
      }
    }
  }

  /**
   * Check whether a content type matches one of the configured types.
   */
  is(value: string): string | undefined {
    const contentType = parse(value, { parameters: this.hasParameters });
    return this.contentType(contentType);
  }

  /**
   * Check whether a request body matches one of the configured types.
   */
  request(req: RequestLike): string | undefined {
    if (!hasBody(req)) return;
    const header = req.headers["content-type"];
    if (!header) return;
    const value = Array.isArray(header) ? header[0] : header;
    return this.is(value);
  }

  contentType(
    contentType: Pick<ContentType, "type" | "parameters">,
  ): string | undefined {
    for (const pattern of this.patterns) {
      if (pattern.match(contentType.type)) {
        const parametersMatch =
          !pattern.hasParameters ||
          Object.keys(pattern.parameters).every((key) => {
            const actual = contentType.parameters[key];
            if (actual === undefined) return false;
            const expected = pattern.parameters[key];
            return expected === this.parameterValue(key, actual);
          });

        if (parametersMatch) return pattern.key;
      }
    }
  }
}
