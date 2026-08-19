import { describe, it, assert } from "vitest";
import { is, request, hasBody, normalize, match } from "./index.js";

describe("request(types)", () => {
  it("should ignore params", () => {
    const req = createRequest("text/html; charset=utf-8");
    assert.strictEqual(request(["text/*"])(req), "text/*");
  });

  it("should ignore params LWS", () => {
    const req = createRequest("text/html ; charset=utf-8");
    assert.strictEqual(request(["text/*"])(req), "text/*");
  });

  it("should ignore casing", () => {
    const req = createRequest("text/HTML");
    assert.strictEqual(request(["text/*"])(req), "text/*");
  });

  it("should parse the content-type header", () => {
    const req = createRequest("text/html**");
    assert.strictEqual(request(["text/*"])(req), "text/*");
  });

  it("should reject invalid expected types", () => {
    assert.throws(() => request(["text/html/"]), /Invalid mime type/);
  });

  describe("when no body is given", () => {
    it("should return undefined", () => {
      const req = { headers: {} };

      assert.strictEqual(request([])(req), undefined);
      assert.strictEqual(request(["image/*"])(req), undefined);
    });
  });

  describe("when no content type is given", () => {
    it("should return undefined", () => {
      const req = createRequest();
      assert.strictEqual(request([])(req), undefined);
      assert.strictEqual(request(["image/*"])(req), undefined);
      assert.strictEqual(request(["text/*", "image/*"])(req), undefined);
    });
  });

  describe("give no types", () => {
    it("should return undefined", () => {
      const req = createRequest("image/png");
      assert.strictEqual(request([])(req), undefined);
    });
  });

  describe("given one type", () => {
    it("should return the matched type or undefined", () => {
      const req = createRequest("application/json");

      assert.strictEqual(request(["json"])(req), "application/json");
      assert.strictEqual(
        request(["application/json"])(req),
        "application/json",
      );
      assert.strictEqual(request(["application/*"])(req), "application/*");
      assert.strictEqual(request(["*/json"])(req), "*/json");

      assert.strictEqual(request(["image/jpeg"])(req), undefined);
      assert.strictEqual(request(["text/*"])(req), undefined);
      assert.strictEqual(request(["*/jpeg"])(req), undefined);
    });
  });

  describe("given multiple types", () => {
    it("should return the first match or undefined", () => {
      const req = createRequest("image/png");

      assert.strictEqual(request(["text/*", "image/*"])(req), "image/*");
      assert.strictEqual(request(["image/*", "text/*"])(req), "image/*");
      assert.strictEqual(request(["image/*", "image/png"])(req), "image/*");
      assert.strictEqual(request(["image/png", "image/*"])(req), "image/png");

      assert.strictEqual(request(["text/*", "application/*"])(req), undefined);
      assert.strictEqual(
        request(["text/html", "text/plain", "application/json"])(req),
        undefined,
      );
    });
  });

  describe("given +suffix", () => {
    it("should match suffix types", () => {
      const req = createRequest("application/vnd+json");

      assert.strictEqual(request(["+json"])(req), "*/*+json");
      assert.strictEqual(
        request(["application/vnd+json"])(req),
        "application/vnd+json",
      );
      assert.strictEqual(
        request(["application/*+json"])(req),
        "application/*+json",
      );
      assert.strictEqual(request(["*/vnd+json"])(req), "*/vnd+json");
      assert.strictEqual(request(["application/json"])(req), undefined);
      assert.strictEqual(request(["text/*+json"])(req), undefined);
    });
  });

  describe('given "*/*"', () => {
    it("should match any content-type", () => {
      const matches = request(["*/*"]);
      assert.strictEqual(matches(createRequest("text/html")), "*/*");
      assert.strictEqual(matches(createRequest("text/xml")), "*/*");
      assert.strictEqual(matches(createRequest("application/json")), "*/*");
      assert.strictEqual(matches(createRequest("application/vnd+json")), "*/*");
    });

    it("should not match invalid content-type", () => {
      assert.strictEqual(request(["*/*"])(createRequest("bogus")), undefined);
    });

    it("should not match body-less request", () => {
      const req = { headers: { "content-type": "text/html" } };
      assert.strictEqual(request(["*/*"])(req), undefined);
    });
  });

  describe("when Content-Type: application/x-www-form-urlencoded", () => {
    it('should match "urlencoded"', () => {
      const req = createRequest("application/x-www-form-urlencoded");

      assert.strictEqual(
        request(["urlencoded"])(req),
        "application/x-www-form-urlencoded",
      );
      assert.strictEqual(
        request(["json", "urlencoded"])(req),
        "application/x-www-form-urlencoded",
      );
      assert.strictEqual(
        request(["urlencoded", "json"])(req),
        "application/x-www-form-urlencoded",
      );
    });
  });

  describe("when Content-Type: multipart/form-data", () => {
    it('should match "multipart/*"', () => {
      const req = createRequest("multipart/form-data");

      assert.strictEqual(request(["multipart/*"])(req), "multipart/*");
    });

    it('should match "multipart"', () => {
      const req = createRequest("multipart/form-data");

      assert.strictEqual(request(["multipart"])(req), "multipart/*");
    });
  });
});

describe("hasBody(req)", () => {
  describe("content-length", () => {
    it("should indicate body", () => {
      const req = { headers: { "content-length": "1" } };
      assert.strictEqual(hasBody(req), true);
    });

    it("should be true when 0", () => {
      const req = { headers: { "content-length": "0" } };
      assert.strictEqual(hasBody(req), true);
    });

    it("should be false when bogus", () => {
      const req = { headers: { "content-length": "bogus" } };
      assert.strictEqual(hasBody(req), false);
    });
  });

  describe("transfer-encoding", () => {
    it("should indicate body", () => {
      const req = { headers: { "transfer-encoding": "chunked" } };
      assert.strictEqual(hasBody(req), true);
    });
  });
});

describe("is(types)", () => {
  it("should ignore params", () => {
    assert.strictEqual(is(["text/*"])("text/html; charset=utf-8"), "text/*");
  });

  it("should ignore casing", () => {
    assert.strictEqual(is(["text/*"])("text/HTML"), "text/*");
  });

  it("should match configured parameters", () => {
    const matches = is(["text/html; charset=utf-8"]);
    assert.strictEqual(matches("text/html; charset=utf-8"), "text/html");
    assert.strictEqual(matches("text/html; charset=iso-8859-1"), undefined);
  });

  it("should not match invalid type", () => {
    assert.throws(() => is(["text/html/"]), /Invalid mime type/);
  });

  describe("given one type", () => {
    it("should return the type or undefined", () => {
      assert.strictEqual(is(["image/png"])("image/png"), "image/png");
      assert.strictEqual(is(["image/*"])("image/png"), "image/*");
      assert.strictEqual(is(["*/png"])("image/png"), "*/png");

      assert.strictEqual(is(["image/jpeg"])("image/png"), undefined);
      assert.strictEqual(is(["text/*"])("image/png"), undefined);
      assert.strictEqual(is(["*/jpeg"])("image/png"), undefined);
    });
  });

  describe("given multiple types", () => {
    it("should return the first match or undefined", () => {
      assert.strictEqual(is(["text/*", "image/*"])("image/png"), "image/*");
      assert.strictEqual(is(["image/*", "text/*"])("image/png"), "image/*");
      assert.strictEqual(is(["image/*", "image/png"])("image/png"), "image/*");
      assert.strictEqual(
        is(["image/png", "image/*"])("image/png"),
        "image/png",
      );

      assert.strictEqual(
        is(["text/*", "application/*"])("image/png"),
        undefined,
      );
      assert.strictEqual(
        is(["text/html", "text/plain", "application/json"])("image/png"),
        undefined,
      );
    });
  });

  describe("given +suffix", () => {
    it("should match suffix types", () => {
      assert.strictEqual(is(["+json"])("application/vnd+json"), "*/*+json");
      assert.strictEqual(
        is(["application/vnd+json"])("application/vnd+json"),
        "application/vnd+json",
      );
      assert.strictEqual(
        is(["application/*+json"])("application/vnd+json"),
        "application/*+json",
      );
      assert.strictEqual(
        is(["*/vnd+json"])("application/vnd+json"),
        "*/vnd+json",
      );
      assert.strictEqual(
        is(["application/json"])("application/vnd+json"),
        undefined,
      );
      assert.strictEqual(
        is(["text/*+json"])("application/vnd+json"),
        undefined,
      );
    });
  });

  describe('given "*/*"', () => {
    it("should match any media type", () => {
      assert.strictEqual(is(["*/*"])("text/html"), "*/*");
      assert.strictEqual(is(["*/*"])("text/xml"), "*/*");
      assert.strictEqual(is(["*/*"])("application/json"), "*/*");
      assert.strictEqual(is(["*/*"])("application/vnd+json"), "*/*");
    });

    it("should not match invalid media type", () => {
      assert.strictEqual(is(["*/*"])("bogus"), undefined);
    });
  });

  describe("when media type is application/x-www-form-urlencoded", () => {
    it('should match "urlencoded"', () => {
      assert.strictEqual(
        is(["urlencoded"])("application/x-www-form-urlencoded"),
        "application/x-www-form-urlencoded",
      );
    });
  });

  describe("when media type is multipart/form-data", () => {
    it('should match "multipart/*"', () => {
      assert.strictEqual(
        is(["multipart/*"])("multipart/form-data"),
        "multipart/*",
      );
    });

    it('should match "multipart"', () => {
      assert.strictEqual(
        is(["multipart"])("multipart/form-data"),
        "multipart/*",
      );
    });
  });
});

describe("match(expected)", () => {
  it("should perform exact matching", () => {
    const matches = match("text/html");
    assert.strictEqual(matches("text/html"), true);
    assert.strictEqual(matches("text/plain"), false);
    assert.strictEqual(matches("text/xml"), false);
    assert.strictEqual(matches("application/html"), false);
    assert.strictEqual(matches("text/html+xml"), false);
  });

  it("should perform type wildcard matching", () => {
    const matches = match("*/html");
    assert.strictEqual(matches("text/html"), true);
    assert.strictEqual(matches("application/html"), true);
    assert.strictEqual(matches("text/xml"), false);
    assert.strictEqual(matches("text/html+xml"), false);
  });

  it("should perform subtype wildcard matching", () => {
    const matches = match("text/*");
    assert.strictEqual(matches("text/html"), true);
    assert.strictEqual(matches("text/xml"), true);
    assert.strictEqual(matches("text/html+xml"), true);
    assert.strictEqual(matches("application/xml"), false);
  });

  it("should perform full wildcard matching", () => {
    const matches = match("*/*");
    assert.strictEqual(matches("text/html"), true);
    assert.strictEqual(matches("text/html+xml"), true);
  });

  it("should perform full wildcard matching with specific suffix", () => {
    const matches = match("*/*+xml");
    assert.strictEqual(matches("text/html+xml"), true);
    assert.strictEqual(matches("text/html"), false);
  });

  it("should reject invalid expected types", () => {
    assert.throws(() => match("text"), /Invalid mime type/);
    assert.throws(() => match("text\/html\/xml"), /Invalid mime type/);
  });

  it("should not match invalid actual types", () => {
    const matches = match("text/*");
    assert.strictEqual(matches("text"), false);
    assert.strictEqual(matches("text/html/xml"), false);
  });
});

describe("normalize(type)", () => {
  it("should return media type for extension", () => {
    assert.strictEqual(normalize("json"), "application/json");
  });

  it("should return expanded wildcard for suffix", () => {
    assert.strictEqual(normalize("+json"), "*/*+json");
  });

  it("should pass through media type", () => {
    assert.strictEqual(normalize("application/json"), "application/json");
  });

  it("should pass through wildcard", () => {
    assert.strictEqual(normalize("*/*"), "*/*");
    assert.strictEqual(normalize("image/*"), "image/*");
  });

  it("should pass through unmapped extension", () => {
    assert.strictEqual(normalize("unknown"), "unknown");
  });

  it('should expand special "urlencoded"', () => {
    assert.strictEqual(
      normalize("urlencoded"),
      "application/x-www-form-urlencoded",
    );
  });

  it('should expand special "multipart"', () => {
    assert.strictEqual(normalize("multipart"), "multipart/*");
  });
});

function createRequest(type?: string) {
  return {
    headers: {
      "content-type": type,
      "transfer-encoding": "chunked",
    },
  };
}
