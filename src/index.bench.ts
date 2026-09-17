import { test } from "vitest";
import * as typeIs from "./index.js";

const { TypeIs, hasBody, match, normalize } = typeIs;

test("request", async ({ bench }) => {
  const req = {
    headers: {
      "content-length": "17",
      "content-type": "application/json; charset=utf-8",
    },
  };

  await bench.compare(
    bench("exact match", () => {
      new TypeIs(["application/json"]).request(req);
    }),
    bench("wildcard match", () => {
      new TypeIs(["text/*", "application/*"]).request(req);
    }),
    { time: 300, iterations: 32 },
  );
});

test("hasBody", async ({ bench }) => {
  const contentLength = { headers: { "content-length": "17" } };
  const transferEncoding = { headers: { "transfer-encoding": "chunked" } };
  const noBody = { headers: {} };

  await bench.compare(
    bench("content-length", () => {
      hasBody(contentLength);
    }),
    bench("transfer-encoding", () => {
      hasBody(transferEncoding);
    }),
    bench("without body headers", () => {
      hasBody(noBody);
    }),
    { time: 300, iterations: 32 },
  );
});

test("is", async ({ bench }) => {
  const exact = new TypeIs(["application/json"]);
  const wildcard = new TypeIs(["text/*", "application/*"]);
  const suffix = new TypeIs(["application/*+json"]);

  await bench.compare(
    bench("exact match", () => {
      exact.is("application/json");
    }),
    bench("wildcard match", () => {
      wildcard.is("application/json");
    }),
    bench("suffix match", () => {
      suffix.is("application/vnd.api+json");
    }),
    { time: 300, iterations: 32 },
  );
});

test("is one shot", async ({ bench }) => {
  await bench.compare(
    bench("exact match", () => {
      new TypeIs(["application/json"]).is("application/json");
    }),
    bench("wildcard match", () => {
      new TypeIs(["text/*", "application/*"]).is("application/json");
    }),
    bench("suffix match", () => {
      new TypeIs(["application/*+json"]).is("application/vnd.api+json");
    }),
    { time: 300, iterations: 32 },
  );
});

test("normalize", async ({ bench }) => {
  await bench.compare(
    bench("mime type", () => {
      normalize("application/json");
    }),
    bench("extension", () => {
      normalize("json");
    }),
    bench("shortcut", () => {
      normalize("urlencoded");
    }),
    bench("suffix", () => {
      normalize("+json");
    }),
    { time: 300, iterations: 32 },
  );
});

test("match", async ({ bench }) => {
  const exact = match("application/json");
  const typeWildcard = match("*/json");
  const subtypeWildcard = match("application/*");
  const suffixWildcard = match("application/*+json");

  await bench.compare(
    bench("exact", () => {
      exact("application/json");
    }),
    bench("type wildcard", () => {
      typeWildcard("application/json");
    }),
    bench("subtype wildcard", () => {
      subtypeWildcard("application/json");
    }),
    bench("suffix wildcard", () => {
      suffixWildcard("application/vnd.api+json");
    }),
    { time: 300, iterations: 32 },
  );
});

test("match one shot", async ({ bench }) => {
  await bench.compare(
    bench("exact", () => {
      match("application/json")("application/json");
    }),
    bench("type wildcard", () => {
      match("*/json")("application/json");
    }),
    bench("subtype wildcard", () => {
      match("application/*")("application/json");
    }),
    bench("suffix wildcard", () => {
      match("application/*+json")("application/vnd.api+json");
    }),
    { time: 300, iterations: 32 },
  );
});
