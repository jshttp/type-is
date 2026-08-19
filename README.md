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
import * as typeis from "type-is";

const isText = typeis.request(["text/*"]);

http.createServer(function (req, res) {
  res.end("you " + (isText(req) ? "sent" : "did not send") + " me text");
});
```

### typeis.is(types)

Compiles an array of type strings into a reusable matcher. The returned function accepts a `content-type` header and returns the first configured type that matches, or `undefined` when none match.

Each type in the `types` array can be one of the following:

- A mime type such as `application/json`.
- A mime type with a wildcard such as `*/*` or `*/json` or `application/*`.
- A suffix such as `+json`. This can be combined with a wildcard such as `*/vnd+json` or `application/*+json`.
- A configured shorthand such as `multipart` or `urlencoded`.
- Any of the above with parameters that must also match, such as `application/json; charset=utf-8`.

```js
var isJson = typeis.is(["application/json", "application/*+json"]);

isJson("application/json"); // => 'application/json'
isJson("application/vnd.api+json"); // => 'application/*+json'
isJson("text/html"); // => undefined
```

### typeis.request(types)

Checks if the `request` is one of the `types`. If the request has no body, even if there is a `Content-Type` header, then `undefined` is returned. Otherwise it uses `is` to check the `content-type` header.

```js
// req.headers.content-type = 'application/json'

request(["json"])(req); // => 'json'
request(["html", "json"])(req); // => 'json'
request(["application/*"])(req); // => 'application/*'
request(["application/json"])(req); // => 'application/json'

request(["html"])(req); // => undefined
```

### typeis.hasBody(request)

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

### typeis.match(expected)

Compile the type string `expected` into a function that matches a MIME type.

```js
typeis.match("text/html")("text/html"); // => true
typeis.match("*/html")("text/html"); // => true
typeis.match("text/*")("text/html"); // => true
typeis.match("*/*")("text/html"); // => true
typeis.match("*/*+json")("application/x-custom+json"); // => true
```

### typeis.normalize(type)

Normalize a `type` string. This works by performing the following:

- If the string contains a `/`, then it is returned as the type.
- If the string starts with `+` (so it is a `+suffix` shorthand like `+json`), then it is expanded to contain the complete wildcard notation of `*/*+suffix`.
- Else the string is assumed to be a file extension and the mapped media type is returned, or the original input if there is no mapping.

The default extensions is kept minimal:

- `'json'` -> `'application/json'`
- `'multipart'` -> `'multipart/*'`
- `'urlencoded'` -> `'application/x-www-form-urlencoded'`

You can pass an object of `{ extensions: string | string[] }` to provide additional mappings.

## Examples

### Example body parser

```js
const express = require("express");
const typeis = require("type-is");

const app = express();
const typeIs = typeis.request(["urlencoded", "json", "multipart"]);

app.use(function bodyParser(req, res, next) {
  if (!typeis.hasBody(req)) {
    return next();
  }

  switch (typeIs(req)) {
    case "urlencoded":
      // parse urlencoded body
      throw new Error("implement urlencoded body parsing");
    case "json":
      // parse json body
      throw new Error("implement json body parsing");
    case "multipart":
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
