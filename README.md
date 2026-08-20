# type-is

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][ci-image]][ci-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Infer the content-type of a request.

## Install

```sh
$ npm install type-is
```

## API

```js
import { createServer } from "http";
import { TypeIs } from "type-is";

const isText = new TypeIs(["text/*"]);

http.createServer(function (req, res) {
  res.end(
    "you " + (isText.request(req) ? "sent" : "did not send") + " me text",
  );
});
```

### new TypeIs(types[, options])

Creates a reusable content type matcher. The optional `options` object accepts a `lookup` function for resolving shorthand types.

Each type in the `types` array can be one of the following:

- A mime type such as `application/json`.
- A mime type with a wildcard such as `*/*` or `*/json` or `application/*`.
- A suffix such as `+json`. This can be combined with a wildcard such as `*/vnd+json` or `application/*+json`.
- A configured shorthand such as `multipart` or `urlencoded`.
- Any of the above with parameters that must also match, such as `application/json; charset=utf-8`.

### typeIs.is(value)

Checks a `content-type` value and returns the first configured type that matches, or `undefined` when none match.

```js
const isJson = new TypeIs(["application/json", "application/*+json"]);

isJson.is("application/json"); // => 'application/json'
isJson.is("application/vnd.api+json"); // => 'application/*+json'
isJson.is("text/html"); // => undefined
```

### typeIs.request(request)

Checks a request against the configured types. If the request has no body, even if there is a `Content-Type` header, then `undefined` is returned. Otherwise it uses `is` to check the `content-type` header.

```js
// req.headers.content-type = 'application/json'

new TypeIs(["json"]).request(req); // => 'application/json'
new TypeIs(["html", "json"]).request(req); // => 'application/json'
new TypeIs(["application/*"]).request(req); // => 'application/*'
new TypeIs(["application/json"]).request(req); // => 'application/json'

new TypeIs(["html"]).request(req); // => undefined
```

### hasBody(request)

Returns true if the given `request` has a body based on the HTTP headers provided.

Having a body has no relation to how large the body is (it may be 0 bytes).
This is similar to how file existence works. If a body does exist, then this
indicates that there is data to read from the Node.js request stream.

```js
if (typeis.hasBody(req)) {
  // read the body, since there is one

  req.on("data", function (chunk) {
    // ...
  });
}
```

### match(expected)

Compile the type string `expected` into a function that matches a MIME type.

```js
typeis.match("text/html")("text/html"); // => true
typeis.match("*/html")("text/html"); // => true
typeis.match("text/*")("text/html"); // => true
typeis.match("*/*")("text/html"); // => true
typeis.match("*/*+json")("application/x-custom+json"); // => true
```

### normalize(type)

Normalize a `type` string. This works by performing the following:

- If the string contains a `/`, then it is returned as the type.
- If the string starts with `+` (so it is a `+suffix` shorthand like `+json`), then it is expanded to contain the complete wildcard notation of `*/*+suffix`.
- Else the string is assumed to be a file extension and the mapped media type is returned, or the original input if there is no mapping.

The default extensions is kept minimal:

- `'json'` -> `'application/json'`
- `'multipart'` -> `'multipart/*'`
- `'urlencoded'` -> `'application/x-www-form-urlencoded'`

You can pass an options object of `{ lookup: (value: string) => string | string[] | undefined }` to provide additional mappings, e.g. [`mime.lookup`](https://github.com/jshttp/mime-types#mimelookuppath).

## Examples

### Example body parser

```js
const express = require("express");
const { TypeIs, hasBody } = require("type-is");

const app = express();
const typeIs = new TypeIs(["urlencoded", "json", "multipart"]);

app.use(function bodyParser(req, res, next) {
  if (!hasBody(req)) {
    return next();
  }

  switch (typeIs.request(req)) {
    case "application/x-www-form-urlencoded":
      // parse urlencoded body
      throw new Error("implement urlencoded body parsing");
    case "application/json":
      // parse json body
      throw new Error("implement json body parsing");
    case "multipart/*":
      // parse multipart body
      throw new Error("implement multipart body parsing");
    default:
      // 415 error code
      res.statusCode = 415;
      res.end();
      break;
  }
});
```

## License

[MIT](LICENSE)

[ci-image]: https://badgen.net/github/checks/jshttp/type-is/master?label=ci
[ci-url]: https://github.com/jshttp/type-is/actions/workflows/ci.yml
[coveralls-image]: https://badgen.net/coveralls/c/github/jshttp/type-is/master
[coveralls-url]: https://coveralls.io/r/jshttp/type-is?branch=master
[node-version-image]: https://badgen.net/npm/node/type-is
[node-version-url]: https://nodejs.org/en/download
[npm-downloads-image]: https://badgen.net/npm/dm/type-is
[npm-url]: https://npmjs.org/package/type-is
[npm-version-image]: https://badgen.net/npm/v/type-is
[travis-image]: https://badgen.net/travis/jshttp/type-is/master
[travis-url]: https://travis-ci.org/jshttp/type-is
