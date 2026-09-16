/*!
 * type-is
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

import { parse, ContentType } from "content-type";

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

  if (expectedSlash === -1 || expected.indexOf("/", expectedSlash + 1) !== -1) {
    throw new TypeError(`Invalid mime type: ${expected}`);
  }

  const type = expected.slice(0, expectedSlash);
  let subtype = expected.slice(expectedSlash + 1);
  let suffix = "";

  if (subtype.startsWith("*+")) {
    suffix = subtype.slice(1);
    subtype = "*";
  }

  if (type !== "*" && subtype !== "*") {
    return (actual: string): boolean => actual === expected;
  }

  return function (actual: string): boolean {
    const actualSlash = actual.indexOf("/");

    if (actualSlash === -1 || actual.indexOf("/", actualSlash + 1) !== -1) {
      return false;
    }

    if (subtype === "*") {
      if (!actual.endsWith(suffix)) return false;
      if (type === "*") return true;
      return expectedSlash === actualSlash && actual.startsWith(type);
    }

    return (
      actualSlash === actual.length - subtype.length - 1 &&
      actual.endsWith(subtype)
    );
  };
}

interface Pattern {
  key: string;
  match: (value: string) => boolean;
  parameters: Record<string, string>;
  hasParameters: boolean;
}

export class TypeIs {
  private readonly hasParameters: boolean = false;
  private readonly patterns: Pattern[] = [];

  /**
   * Compile a list of expected mime types into a reusable matcher.
   */
  constructor(types: readonly string[], options?: NormalizeOptions) {
    for (const t of types) {
      const contentType = parse(t);
      const hasParameters = Object.keys(contentType.parameters).length > 0;
      const type = normalize(contentType.type, options);

      this.hasParameters ||= hasParameters;

      if (Array.isArray(type)) {
        for (const t of type) {
          this.patterns.push({
            key: t,
            match: match(t),
            parameters: contentType.parameters,
            hasParameters,
          });
        }
      } else {
        this.patterns.push({
          key: type,
          match: match(type),
          parameters: contentType.parameters,
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
          Object.keys(pattern.parameters).every(
            (key) => pattern.parameters[key] === contentType.parameters[key],
          );

        if (parametersMatch) return pattern.key;
      }
    }
  }
}
