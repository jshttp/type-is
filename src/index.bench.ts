import { bench, describe } from "vitest";
import { hasBody, is, match, request, normalize } from "./index.js";

describe("request", () => {
  const req = {
    headers: {
      "content-length": "17",
      "content-type": "application/json; charset=utf-8",
    },
  };

  bench("exact match", () => {
    request(["application/json"])(req);
  });

  bench("wildcard match", () => {
    request(["text/*", "application/*"])(req);
  });
});

describe("hasBody", () => {
  const contentLength = { headers: { "content-length": "17" } };
  const transferEncoding = { headers: { "transfer-encoding": "chunked" } };
  const noBody = { headers: {} };

  bench("content-length", () => {
    hasBody(contentLength);
  });

  bench("transfer-encoding", () => {
    hasBody(transferEncoding);
  });

  bench("without body headers", () => {
    hasBody(noBody);
  });
});

describe("is", () => {
  const exact = is(["application/json"]);
  const wildcard = is(["text/*", "application/*"]);
  const suffix = is(["application/*+json"]);

  bench("exact match", () => {
    exact("application/json");
  });

  bench("wildcard match", () => {
    wildcard("application/json");
  });

  bench("suffix match", () => {
    suffix("application/vnd.api+json");
  });
});

describe("is one shot", () => {
  bench("exact match", () => {
    is(["application/json"])("application/json");
  });

  bench("wildcard match", () => {
    is(["text/*", "application/*"])("application/json");
  });

  bench("suffix match", () => {
    is(["application/*+json"])("application/vnd.api+json");
  });
});

describe("normalize", () => {
  bench("mime type", () => {
    normalize("application/json");
  });

  bench("extension", () => {
    normalize("json");
  });

  bench("shortcut", () => {
    normalize("urlencoded");
  });

  bench("suffix", () => {
    normalize("+json");
  });
});

describe("match", () => {
  const exact = match("application/json");
  const typeWildcard = match("*/json");
  const subtypeWildcard = match("application/*");
  const suffixWildcard = match("application/*+json");

  bench("exact", () => {
    exact("application/json");
  });

  bench("type wildcard", () => {
    typeWildcard("application/json");
  });

  bench("subtype wildcard", () => {
    subtypeWildcard("application/json");
  });

  bench("suffix wildcard", () => {
    suffixWildcard("application/vnd.api+json");
  });
});

describe("match one shot", () => {
  bench("exact", () => {
    match("application/json")("application/json");
  });

  bench("type wildcard", () => {
    match("*/json")("application/json");
  });

  bench("subtype wildcard", () => {
    match("application/*")("application/json");
  });

  bench("suffix wildcard", () => {
    match("application/*+json")("application/vnd.api+json");
  });
});
