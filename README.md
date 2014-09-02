# type-is

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

Infer the content-type of a request.

### Install

```sh
$ npm install type-is
```

## API

```js
var http = require('http')
var is   = require('type-is')

http.createServer(function (req, res) {
  var istext = is(req, ['text/*'])
  res.end('you ' + (istext ? 'sent' : 'did not send') + ' me text')
})
```

### type = is(request, types)

`request` is the node HTTP request. `types` is an array of types.

```js
// req.headers.content-type = 'application/json'

is(req, ['json'])             // 'json'
is(req, ['html', 'json'])     // 'json'
is(req, ['application/*'])    // 'application/json'
is(req, ['application/json']) // 'application/json'

is(req, ['html']) // false
```

#### Each type can be:

- An extension name such as `json`. This name will be returned if matched.
- A mime type such as `application/json`.
- A mime type with a wildcard such as `*/json` or `application/*`. The full mime type will be returned if matched
- A suffix such as `+json`. This can be combined with a wildcard such as `*/vnd+json` or `application/*+json`. The full mime type will be returned if matched.

`false` will be returned if no type matches.

## Examples

#### Example body parser

```js
var is = require('type-is');
var parse = require('body');
var busboy = require('busboy');

function bodyParser(req, res, next) {
  if (!is.hasBody(req)) return next();

  switch (is(req, ['urlencoded', 'json', 'multipart'])) {
    case 'urlencoded':
      // parse urlencoded body
      break
    case 'json':
      // parse json body
      break
    case 'multipart':
      // parse multipart body
      break
    default:
      // 415 error code
  }
}
```

[npm-image]: https://img.shields.io/npm/v/type-is.svg?style=flat-square
[npm-url]: https://npmjs.org/package/type-is
[travis-image]: https://img.shields.io/travis/jshttp/type-is.svg?style=flat-square
[travis-url]: https://travis-ci.org/jshttp/type-is
[coveralls-image]: https://img.shields.io/coveralls/jshttp/type-is.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/jshttp/type-is?branch=master
[david-image]: http://img.shields.io/david/jshttp/type-is.svg?style=flat-square
[david-url]: https://david-dm.org/jshttp/type-is
[license-image]: http://img.shields.io/npm/l/type-is.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/type-is.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/type-is
