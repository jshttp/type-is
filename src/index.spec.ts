import { describe, it, assert } from "vitest";
import { is, request, hasBody, normalize, match } from "./index.js";

describe("request(req, types)", () => {
  it("should ignore params", () => {
    const req = createRequest("text/html; charset=utf-8");
    assert.strictEqual(request(req, ["text/*"]), "text/html");
  });

  it("should ignore params LWS", () => {
    const req = createRequest("text/html ; charset=utf-8");
    assert.strictEqual(request(req, ["text/*"]), "text/html");
  });

  it("should ignore casing", () => {
    const req = createRequest("text/HTML");
    assert.strictEqual(request(req, ["text/*"]), "text/html");
  });

  it("should fail invalid type", () => {
    const req = createRequest("text/html**");
    assert.strictEqual(request(req, ["text/*"]), false);
  });

  it("should not match invalid type", () => {
    const req = createRequest("text/html");
    assert.strictEqual(request(req, ["text/html/"]), false);
  });

  describe("when no body is given", () => {
    it("should return null", () => {
      const req = { headers: {} };

      assert.strictEqual(request(req), false);
      assert.strictEqual(request(req, ["image/*"]), false);
    });
  });

  describe("when no content type is given", () => {
    it("should return false", () => {
      const req = createRequest();
      assert.strictEqual(request(req), false);
      assert.strictEqual(request(req, ["image/*"]), false);
      assert.strictEqual(request(req, ["text/*", "image/*"]), false);
    });
  });

  describe("give no types", () => {
    it("should return the mime type", () => {
      const req = createRequest("image/png");
      assert.strictEqual(request(req), "image/png");
    });
  });

  describe("given one type", () => {
    it("should return the type or false", () => {
      const req = createRequest("image/png");

      assert.strictEqual(request(req, ["png"]), "png");
      assert.strictEqual(request(req, [".png"]), ".png");
      assert.strictEqual(request(req, ["image/png"]), "image/png");
      assert.strictEqual(request(req, ["image/*"]), "image/png");
      assert.strictEqual(request(req, ["*/png"]), "image/png");

      assert.strictEqual(request(req, ["jpeg"]), false);
      assert.strictEqual(request(req, [".jpeg"]), false);
      assert.strictEqual(request(req, ["image/jpeg"]), false);
      assert.strictEqual(request(req, ["text/*"]), false);
      assert.strictEqual(request(req, ["*/jpeg"]), false);

      assert.strictEqual(request(req, ["bogus"]), false);
      assert.strictEqual(request(req, ["something/bogus*"]), false);
    });
  });

  describe("given multiple types", () => {
    it("should return the first match or false", () => {
      const req = createRequest("image/png");

      assert.strictEqual(request(req, ["png"]), "png");
      assert.strictEqual(request(req, [".png"]), ".png");
      assert.strictEqual(request(req, ["text/*", "image/*"]), "image/png");
      assert.strictEqual(request(req, ["image/*", "text/*"]), "image/png");
      assert.strictEqual(request(req, ["image/*", "image/png"]), "image/png");
      assert.strictEqual(request(req, ["image/png", "image/*"]), "image/png");

      assert.strictEqual(request(req, ["jpeg"]), false);
      assert.strictEqual(request(req, [".jpeg"]), false);
      assert.strictEqual(request(req, ["text/*", "application/*"]), false);
      assert.strictEqual(
        request(req, ["text/html", "text/plain", "application/json"]),
        false,
      );
    });
  });

  describe("given +suffix", () => {
    it("should match suffix types", () => {
      const req = createRequest("application/vnd+json");

      assert.strictEqual(request(req, ["+json"]), "application/vnd+json");
      assert.strictEqual(
        request(req, ["application/vnd+json"]),
        "application/vnd+json",
      );
      assert.strictEqual(
        request(req, ["application/*+json"]),
        "application/vnd+json",
      );
      assert.strictEqual(request(req, ["*/vnd+json"]), "application/vnd+json");
      assert.strictEqual(request(req, ["application/json"]), false);
      assert.strictEqual(request(req, ["text/*+json"]), false);
    });
  });

  describe('given "*/*"', () => {
    it("should match any content-type", () => {
      assert.strictEqual(
        request(createRequest("text/html"), ["*/*"]),
        "text/html",
      );
      assert.strictEqual(
        request(createRequest("text/xml"), ["*/*"]),
        "text/xml",
      );
      assert.strictEqual(
        request(createRequest("application/json"), ["*/*"]),
        "application/json",
      );
      assert.strictEqual(
        request(createRequest("application/vnd+json"), ["*/*"]),
        "application/vnd+json",
      );
    });

    it("should not match invalid content-type", () => {
      assert.strictEqual(request(createRequest("bogus"), ["*/*"]), false);
    });

    it("should not match body-less request", () => {
      const req = { headers: { "content-type": "text/html" } };
      assert.strictEqual(request(req, ["*/*"]), false);
    });
  });

  describe("when Content-Type: application/x-www-form-urlencoded", () => {
    it('should match "urlencoded"', () => {
      const req = createRequest("application/x-www-form-urlencoded");

      assert.strictEqual(request(req, ["urlencoded"]), "urlencoded");
      assert.strictEqual(request(req, ["json", "urlencoded"]), "urlencoded");
      assert.strictEqual(request(req, ["urlencoded", "json"]), "urlencoded");
    });
  });

  describe("when Content-Type: multipart/form-data", () => {
    it('should match "multipart/*"', () => {
      const req = createRequest("multipart/form-data");

      assert.strictEqual(request(req, ["multipart/*"]), "multipart/form-data");
    });

    it('should match "multipart"', () => {
      const req = createRequest("multipart/form-data");

      assert.strictEqual(request(req, ["multipart"]), "multipart");
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

describe("is(mediaType, types)", () => {
  it("should ignore params", () => {
    assert.strictEqual(is("text/html; charset=utf-8", ["text/*"]), "text/html");
  });

  it("should ignore casing", () => {
    assert.strictEqual(is("text/HTML", ["text/*"]), "text/html");
  });

  it("should fail invalid type", () => {
    assert.strictEqual(is("text/html**", ["text/*"]), false);
  });

  it("should not match invalid type", () => {
    assert.strictEqual(is("text/html", ["text/html/"]), false);
  });

  describe("when no media type is given", () => {
    it("should return false", () => {
      assert.strictEqual(is("", ["application/json"]), false);
      assert.strictEqual(is(null, ["image/*"]), false);
      assert.strictEqual(is(undefined, ["text/*", "image/*"]), false);
    });
  });

  describe("given no types", () => {
    it("should return the mime type", () => {
      assert.strictEqual(is("image/png"), "image/png");
    });
  });

  describe("given one type", () => {
    it("should return the type or false", () => {
      assert.strictEqual(is("image/png", ["png"]), "png");
      assert.strictEqual(is("image/png", [".png"]), ".png");
      assert.strictEqual(is("image/png", ["image/png"]), "image/png");
      assert.strictEqual(is("image/png", ["image/*"]), "image/png");
      assert.strictEqual(is("image/png", ["*/png"]), "image/png");

      assert.strictEqual(is("image/png", ["jpeg"]), false);
      assert.strictEqual(is("image/png", [".jpeg"]), false);
      assert.strictEqual(is("image/png", ["image/jpeg"]), false);
      assert.strictEqual(is("image/png", ["text/*"]), false);
      assert.strictEqual(is("image/png", ["*/jpeg"]), false);

      assert.strictEqual(is("image/png", ["bogus"]), false);
      assert.strictEqual(is("image/png", ["something/bogus*"]), false);
    });
  });

  describe("given multiple types", () => {
    it("should return the first match or false", () => {
      assert.strictEqual(is("image/png", ["png"]), "png");
      assert.strictEqual(is("image/png", [".png"]), ".png");
      assert.strictEqual(is("image/png", ["text/*", "image/*"]), "image/png");
      assert.strictEqual(is("image/png", ["image/*", "text/*"]), "image/png");
      assert.strictEqual(
        is("image/png", ["image/*", "image/png"]),
        "image/png",
      );
      assert.strictEqual(
        is("image/png", ["image/png", "image/*"]),
        "image/png",
      );

      assert.strictEqual(is("image/png", ["jpeg"]), false);
      assert.strictEqual(is("image/png", [".jpeg"]), false);
      assert.strictEqual(is("image/png", ["text/*", "application/*"]), false);
      assert.strictEqual(
        is("image/png", ["text/html", "text/plain", "application/json"]),
        false,
      );
    });
  });

  describe("given +suffix", () => {
    it("should match suffix types", () => {
      assert.strictEqual(
        is("application/vnd+json", ["+json"]),
        "application/vnd+json",
      );
      assert.strictEqual(
        is("application/vnd+json", ["application/vnd+json"]),
        "application/vnd+json",
      );
      assert.strictEqual(
        is("application/vnd+json", ["application/*+json"]),
        "application/vnd+json",
      );
      assert.strictEqual(
        is("application/vnd+json", ["*/vnd+json"]),
        "application/vnd+json",
      );
      assert.strictEqual(
        is("application/vnd+json", ["application/json"]),
        false,
      );
      assert.strictEqual(is("application/vnd+json", ["text/*+json"]), false);
    });
  });

  describe('given "*/*"', () => {
    it("should match any media type", () => {
      assert.strictEqual(is("text/html", ["*/*"]), "text/html");
      assert.strictEqual(is("text/xml", ["*/*"]), "text/xml");
      assert.strictEqual(is("application/json", ["*/*"]), "application/json");
      assert.strictEqual(
        is("application/vnd+json", ["*/*"]),
        "application/vnd+json",
      );
    });

    it("should not match invalid media type", () => {
      assert.strictEqual(is("bogus", ["*/*"]), false);
    });
  });

  describe("when media type is application/x-www-form-urlencoded", () => {
    it('should match "urlencoded"', () => {
      assert.strictEqual(
        is("application/x-www-form-urlencoded", ["urlencoded"]),
        "urlencoded",
      );
      assert.strictEqual(
        is("application/x-www-form-urlencoded", ["json", "urlencoded"]),
        "urlencoded",
      );
      assert.strictEqual(
        is("application/x-www-form-urlencoded", ["urlencoded", "json"]),
        "urlencoded",
      );
    });
  });

  describe("when media type is multipart/form-data", () => {
    it('should match "multipart/*"', () => {
      assert.strictEqual(
        is("multipart/form-data", ["multipart/*"]),
        "multipart/form-data",
      );
    });

    it('should match "multipart"', () => {
      assert.strictEqual(is("multipart/form-data", ["multipart"]), "multipart");
    });
  });
});

describe("match(expected, actual)", () => {
  it("should perform exact matching", () => {
    assert.strictEqual(match("text/html", "text/html"), true);
    assert.strictEqual(match("text/html", "text/plain"), false);
    assert.strictEqual(match("text/html", "text/xml"), false);
    assert.strictEqual(match("text/html", "application/html"), false);
    assert.strictEqual(match("text/html", "text/html+xml"), false);
  });

  it("should perform type wildcard matching", () => {
    assert.strictEqual(match("*/html", "text/html"), true);
    assert.strictEqual(match("*/html", "application/html"), true);
    assert.strictEqual(match("*/html", "text/xml"), false);
    assert.strictEqual(match("*/html", "text/html+xml"), false);
  });

  it("should perform subtype wildcard matching", () => {
    assert.strictEqual(match("text/*", "text/html"), true);
    assert.strictEqual(match("text/*", "text/xml"), true);
    assert.strictEqual(match("text/*", "text/html+xml"), true);
    assert.strictEqual(match("text/*", "application/xml"), false);
  });

  it("should perform full wildcard matching", () => {
    assert.strictEqual(match("*/*", "text/html"), true);
    assert.strictEqual(match("*/*", "text/html+xml"), true);
    assert.strictEqual(match("*/*+xml", "text/html+xml"), true);
  });

  it("should perform full wildcard matching with specific suffix", () => {
    assert.strictEqual(match("*/*+xml", "text/html+xml"), true);
    assert.strictEqual(match("*/*+xml", "text/html"), false);
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

  it("should return empty string for unmapped extension", () => {
    assert.strictEqual(normalize("unknown"), "");
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
