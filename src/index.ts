/*!
 * type-is
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

import { parse } from "content-type";

/**
 * Node.js HTTP request shape.
 */
export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Check if the incoming request contains the "Content-Type" header field, and
 * it contains any of the given mime `type`s. If there is no request body or
 * content type, `false` is returned. Otherwise, it returns the first `type`
 * that matches.
 */
export function request(
  types: string[],
): (req: RequestLike) => string | undefined {
  const isType = is(types);

  return (req: RequestLike): string | undefined => {
    if (!hasBody(req)) return;
    const header = req.headers["content-type"];
    if (!header) return;
    const value = Array.isArray(header) ? header[0] : header;
    return isType(value);
  };
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
}

/**
 * Compile a list of expected mime types into a reusable matcher.
 */
export function is(
  types: string[],
  options?: NormalizeOptions,
): (value: string) => string | undefined {
  let hasParameters = false;
  const patterns: Pattern[] = [];

  for (const t of types) {
    const contentType = parse(t);
    hasParameters ||= Object.keys(contentType.parameters).length > 0;
    const type = normalize(contentType.type, options);

    if (Array.isArray(type)) {
      for (const t of type) {
        patterns.push({
          key: t,
          match: match(t),
          parameters: contentType.parameters,
        });
      }
    } else {
      patterns.push({
        key: type,
        match: match(type),
        parameters: contentType.parameters,
      });
    }
  }

  return function (value: string): string | undefined {
    const contentType = parse(value, { parameters: hasParameters });

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      if (pattern.match(contentType.type)) {
        const parametersMatch =
          !hasParameters ||
          Object.keys(pattern.parameters).every(
            (key) => pattern.parameters[key] === contentType.parameters[key],
          );

        if (parametersMatch) return pattern.key;
      }
    }

    return undefined;
  };
}

export class TypeIs {
  constructor(types: string[], options?: NormalizeOptions) {
    this.matcher = is(types, options);
  }

  private matcher: (value: string) => string | undefined;
}
