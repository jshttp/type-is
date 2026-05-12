/*!
 * type-is
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

import { parse } from "content-type";
import { lookup } from "mime-types";
import { test } from "media-typer";

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
export function request(req: RequestLike, types?: string[]): string | false {
  if (!hasBody(req)) return false;
  const header = req.headers["content-type"];
  if (!header) return false;
  return is(Array.isArray(header) ? header[0] : header, types);
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
 * Compare a `value` content-type with `types`. Each `type` can be an extension
 * like `html`, a special shortcut like `multipart` or `urlencoded`, or a mime
 * type.
 *
 * If no types match, `false` is returned. Otherwise, the first `type` that
 * matches is returned.
 */
export function is(
  value: string | undefined | null,
  types?: string[],
): string | false {
  const val = normalizeType(value);
  if (!val) return false;
  if (!types || types.length === 0) return val;

  for (const type of types) {
    const normalized = normalize(type);
    if (match(normalized, val)) {
      return type[0] === "+" || type.indexOf("*") !== -1 ? val : type;
    }
  }

  return false;
}

/**
 * Normalize a mime type. If it's a shorthand, expand it to a valid mime type.
 */
export function normalize(type: string): string {
  switch (type) {
    case "urlencoded":
      return "application/x-www-form-urlencoded";
    case "multipart":
      return "multipart/*";
  }

  if (type.startsWith("+")) return `*/*${type}`;
  if (type.includes("/")) return type;
  return lookup(type) || "";
}

/**
 * Check if `expected` mime type matches `actual` mime type with wildcard and
 * +suffix support.
 */
export function match(expected: string, actual: string): boolean {
  const actualParts = actual.split("/");
  const expectedParts = expected.split("/");

  if (actualParts.length !== 2 || expectedParts.length !== 2) return false;

  if (expectedParts[0] !== "*" && expectedParts[0] !== actualParts[0]) {
    return false;
  }

  if (expectedParts[1].slice(0, 2) === "*+") {
    return (
      expectedParts[1].length <= actualParts[1].length + 1 &&
      expectedParts[1].slice(1) ===
        actualParts[1].slice(1 - expectedParts[1].length)
    );
  }

  if (expectedParts[1] !== "*" && expectedParts[1] !== actualParts[1]) {
    return false;
  }

  return true;
}

/**
 * Normalize a type and remove parameters.
 */
function normalizeType(value: string | undefined | null): string | null {
  if (!value) return null;
  const { type } = parse(value, { parameters: false });
  return test(type) ? type : null;
}
