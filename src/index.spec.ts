import { describe, it, assert } from "vitest";
import { TypeIs, hasBody, normalize, match } from "./index.js";

describe("TypeIs#request(req)", () => {
  it("should ignore params", () => {
    const req = createRequest("text/html; charset=utf-8");
    assert.strictEqual(new TypeIs(["text/*"]).request(req), "text/*");
  });

  it("should ignore params LWS", () => {
    const req = createRequest("text/html ; charset=utf-8");
    assert.strictEqual(new TypeIs(["text/*"]).request(req), "text/*");
  });

  it("should ignore casing", () => {
    const req = createRequest("text/HTML");
    assert.strictEqual(new TypeIs(["text/*"]).request(req), "text/*");
  });

  it("should parse the content-type header", () => {
    const req = createRequest("text/html**");
    assert.strictEqual(new TypeIs(["text/*"]).request(req), "text/*");
  });

  it("should reject invalid expected types", () => {
    assert.throws(() => new TypeIs(["text/html/"]), /Invalid mime type/);
  });

  describe("when no body is given", () => {
    it("should return undefined", () => {
      const req = { headers: {} };

      assert.strictEqual(new TypeIs([]).request(req), undefined);
      assert.strictEqual(new TypeIs(["image/*"]).request(req), undefined);
    });
  });

  describe("when no content type is given", () => {
    it("should return undefined", () => {
      const req = createRequest();
      assert.strictEqual(new TypeIs([]).request(req), undefined);
      assert.strictEqual(new TypeIs(["image/*"]).request(req), undefined);
      assert.strictEqual(
        new TypeIs(["text/*", "image/*"]).request(req),
        undefined,
      );
    });
  });

  describe("give no types", () => {
    it("should return undefined", () => {
      const req = createRequest("image/png");
      assert.strictEqual(new TypeIs([]).request(req), undefined);
    });
  });

  describe("given one type", () => {
    it("should return the matched type or undefined", () => {
      const req = createRequest("application/json");

      assert.strictEqual(new TypeIs(["json"]).request(req), "application/json");
      assert.strictEqual(
        new TypeIs(["application/json"]).request(req),
        "application/json",
      );
      assert.strictEqual(
        new TypeIs(["application/*"]).request(req),
        "application/*",
      );
      assert.strictEqual(new TypeIs(["*/json"]).request(req), "*/json");

      assert.strictEqual(new TypeIs(["image/jpeg"]).request(req), undefined);
      assert.strictEqual(new TypeIs(["text/*"]).request(req), undefined);
      assert.strictEqual(new TypeIs(["*/jpeg"]).request(req), undefined);
    });
  });

  describe("given multiple types", () => {
    it("should return the first match or undefined", () => {
      const req = createRequest("image/png");

      assert.strictEqual(
        new TypeIs(["text/*", "image/*"]).request(req),
        "image/*",
      );
      assert.strictEqual(
        new TypeIs(["image/*", "text/*"]).request(req),
        "image/*",
      );
      assert.strictEqual(
        new TypeIs(["image/*", "image/png"]).request(req),
        "image/*",
      );
      assert.strictEqual(
        new TypeIs(["image/png", "image/*"]).request(req),
        "image/png",
      );

      assert.strictEqual(
        new TypeIs(["text/*", "application/*"]).request(req),
        undefined,
      );
      assert.strictEqual(
        new TypeIs(["text/html", "text/plain", "application/json"]).request(
          req,
        ),
        undefined,
      );
    });
  });

  describe("given +suffix", () => {
    it("should match suffix types", () => {
      const req = createRequest("application/vnd+json");

      assert.strictEqual(new TypeIs(["+json"]).request(req), "*/*+json");
      assert.strictEqual(
        new TypeIs(["application/vnd+json"]).request(req),
        "application/vnd+json",
      );
      assert.strictEqual(
        new TypeIs(["application/*+json"]).request(req),
        "application/*+json",
      );
      assert.strictEqual(new TypeIs(["*/vnd+json"]).request(req), "*/vnd+json");
      assert.strictEqual(
        new TypeIs(["application/json"]).request(req),
        undefined,
      );
      assert.strictEqual(new TypeIs(["text/*+json"]).request(req), undefined);
    });
  });

  describe('given "*/*"', () => {
    it("should match any content-type", () => {
      const matches = new TypeIs(["*/*"]);
      assert.strictEqual(matches.request(createRequest("text/html")), "*/*");
      assert.strictEqual(matches.request(createRequest("text/xml")), "*/*");
      assert.strictEqual(
        matches.request(createRequest("application/json")),
        "*/*",
      );
      assert.strictEqual(
        matches.request(createRequest("application/vnd+json")),
        "*/*",
      );
    });

    it("should not match invalid content-type", () => {
      assert.strictEqual(
        new TypeIs(["*/*"]).request(createRequest("bogus")),
        undefined,
      );
    });

    it("should not match body-less request", () => {
      const req = { headers: { "content-type": "text/html" } };
      assert.strictEqual(new TypeIs(["*/*"]).request(req), undefined);
    });
  });

  describe("when Content-Type: application/x-www-form-urlencoded", () => {
    it('should match "urlencoded"', () => {
      const req = createRequest("application/x-www-form-urlencoded");

      assert.strictEqual(
        new TypeIs(["urlencoded"]).request(req),
        "application/x-www-form-urlencoded",
      );
      assert.strictEqual(
        new TypeIs(["json", "urlencoded"]).request(req),
        "application/x-www-form-urlencoded",
      );
      assert.strictEqual(
        new TypeIs(["urlencoded", "json"]).request(req),
        "application/x-www-form-urlencoded",
      );
    });
  });

  describe("when Content-Type: multipart/form-data", () => {
    it('should match "multipart/*"', () => {
      const req = createRequest("multipart/form-data");

      assert.strictEqual(
        new TypeIs(["multipart/*"]).request(req),
        "multipart/*",
      );
    });

    it('should match "multipart"', () => {
      const req = createRequest("multipart/form-data");

      assert.strictEqual(new TypeIs(["multipart"]).request(req), "multipart/*");
    });
  });
});

describe("TypeIs#contentType(contentType)", () => {
  it("should return the first matching type", () => {
    const matches = new TypeIs(["text/*", "application/*", "application/json"]);

    assert.strictEqual(
      matches.contentType({ type: "application/json", parameters: {} }),
      "application/*",
    );
  });

  it("should return undefined when no type matches", () => {
    const matches = new TypeIs(["text/*"]);

    assert.strictEqual(
      matches.contentType({ type: "application/json", parameters: {} }),
      undefined,
    );
  });

  it("should match configured parameters", () => {
    const matches = new TypeIs(["text/html; charset=utf-8"]);

    assert.strictEqual(
      matches.contentType({
        type: "text/html",
        parameters: { charset: "utf-8", boundary: "example" },
      }),
      "text/html",
    );
    assert.strictEqual(
      matches.contentType({
        type: "text/html",
        parameters: { charset: "iso-8859-1" },
      }),
      undefined,
    );
  });

  it("should fall through a parameter mismatch", () => {
    const matches = new TypeIs(["text/html; charset=utf-8", "text/html"]);

    assert.strictEqual(
      matches.contentType({
        type: "text/html",
        parameters: { charset: "iso-8859-1" },
      }),
      "text/html",
    );
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

describe("TypeIs#is(value)", () => {
  it("should ignore params", () => {
    assert.strictEqual(
      new TypeIs(["text/*"]).is("text/html; charset=utf-8"),
      "text/*",
    );
  });

  it("should ignore casing", () => {
    assert.strictEqual(new TypeIs(["text/*"]).is("text/HTML"), "text/*");
  });

  it("should match configured parameters", () => {
    const matches = new TypeIs(["text/html; charset=utf-8"]);
    assert.strictEqual(matches.is("text/html; charset=utf-8"), "text/html");
    assert.strictEqual(matches.is("text/html; charset=iso-8859-1"), undefined);
  });

  it("should not match invalid type", () => {
    assert.throws(() => new TypeIs(["text/html/"]), /Invalid mime type/);
  });

  describe("with lookup option", () => {
    it("should match a string mapping", () => {
      const matches = new TypeIs(["yaml"], {
        lookup: (value: string) => {
          switch (value) {
            case "yaml":
              return "application/yaml";
            default:
              return undefined;
          }
        },
      });

      assert.strictEqual(matches.is("application/yaml"), "application/yaml");
      assert.strictEqual(matches.is("text/yaml"), undefined);
    });

    it("should match a string array mapping", () => {
      const matches = new TypeIs(["yaml"], {
        lookup: (value: string) => {
          switch (value) {
            case "yaml":
              return ["application/yaml", "text/yaml"];
            default:
              return undefined;
          }
        },
      });

      assert.strictEqual(matches.is("application/yaml"), "application/yaml");
      assert.strictEqual(matches.is("text/yaml"), "text/yaml");
    });
  });

  describe("given one type", () => {
    it("should return the type or undefined", () => {
      assert.strictEqual(
        new TypeIs(["image/png"]).is("image/png"),
        "image/png",
      );
      assert.strictEqual(new TypeIs(["image/*"]).is("image/png"), "image/*");
      assert.strictEqual(new TypeIs(["*/png"]).is("image/png"), "*/png");

      assert.strictEqual(new TypeIs(["image/jpeg"]).is("image/png"), undefined);
      assert.strictEqual(new TypeIs(["text/*"]).is("image/png"), undefined);
      assert.strictEqual(new TypeIs(["*/jpeg"]).is("image/png"), undefined);
    });
  });

  describe("given multiple types", () => {
    it("should return the first match or undefined", () => {
      assert.strictEqual(
        new TypeIs(["text/*", "image/*"]).is("image/png"),
        "image/*",
      );
      assert.strictEqual(
        new TypeIs(["image/*", "text/*"]).is("image/png"),
        "image/*",
      );
      assert.strictEqual(
        new TypeIs(["image/*", "image/png"]).is("image/png"),
        "image/*",
      );
      assert.strictEqual(
        new TypeIs(["image/png", "image/*"]).is("image/png"),
        "image/png",
      );

      assert.strictEqual(
        new TypeIs(["text/*", "application/*"]).is("image/png"),
        undefined,
      );
      assert.strictEqual(
        new TypeIs(["text/html", "text/plain", "application/json"]).is(
          "image/png",
        ),
        undefined,
      );
    });
  });

  describe("given +suffix", () => {
    it("should match suffix types", () => {
      assert.strictEqual(
        new TypeIs(["+json"]).is("application/vnd+json"),
        "*/*+json",
      );
      assert.strictEqual(
        new TypeIs(["application/vnd+json"]).is("application/vnd+json"),
        "application/vnd+json",
      );
      assert.strictEqual(
        new TypeIs(["application/*+json"]).is("application/vnd+json"),
        "application/*+json",
      );
      assert.strictEqual(
        new TypeIs(["*/vnd+json"]).is("application/vnd+json"),
        "*/vnd+json",
      );
      assert.strictEqual(
        new TypeIs(["application/json"]).is("application/vnd+json"),
        undefined,
      );
      assert.strictEqual(
        new TypeIs(["text/*+json"]).is("application/vnd+json"),
        undefined,
      );
    });
  });

  describe('given "*/*"', () => {
    it("should match any media type", () => {
      assert.strictEqual(new TypeIs(["*/*"]).is("text/html"), "*/*");
      assert.strictEqual(new TypeIs(["*/*"]).is("text/xml"), "*/*");
      assert.strictEqual(new TypeIs(["*/*"]).is("application/json"), "*/*");
      assert.strictEqual(new TypeIs(["*/*"]).is("application/vnd+json"), "*/*");
    });

    it("should not match invalid media type", () => {
      assert.strictEqual(new TypeIs(["*/*"]).is("bogus"), undefined);
    });
  });

  describe("when media type is application/x-www-form-urlencoded", () => {
    it('should match "urlencoded"', () => {
      assert.strictEqual(
        new TypeIs(["urlencoded"]).is("application/x-www-form-urlencoded"),
        "application/x-www-form-urlencoded",
      );
    });
  });

  describe("when media type is multipart/form-data", () => {
    it('should match "multipart/*"', () => {
      assert.strictEqual(
        new TypeIs(["multipart/*"]).is("multipart/form-data"),
        "multipart/*",
      );
    });

    it('should match "multipart"', () => {
      assert.strictEqual(
        new TypeIs(["multipart"]).is("multipart/form-data"),
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
