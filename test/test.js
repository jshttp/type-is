
var assert = require('assert')
var typeis = require('..')
var http2
var Readable

if (process.env.HTTP2_TEST) {
  http2 = require('http2')
  Readable = require('stream').Readable
}

describe('typeis(req, type)', function () {
  it('should ignore params', function (done) {
    createRequest('text/html; charset=utf-8', function (req) {
      assert.equal(typeis(req, ['text/*']), 'text/html')
      done()
    })
  })

  it('should ignore params LWS', function (done) {
    createRequest('text/html ; charset=utf-8', function (req) {
      assert.equal(typeis(req, ['text/*']), 'text/html')
      done()
    })
  })

  it('should ignore casing', function (done) {
    createRequest('text/HTML', function (req) {
      assert.equal(typeis(req, ['text/*']), 'text/html')
      done()
    })
  })

  it('should fail invalid type', function (done) {
    createRequest('text/html**', function (req) {
      assert.strictEqual(typeis(req, ['text/*']), false)
      done()
    })
  })

  it('should not match invalid type', function (done) {
    createRequest('text/html', function (req) {
      assert.strictEqual(typeis(req, ['text/html/']), false)
      assert.strictEqual(typeis(req, [undefined, null, true, function () {}]), false)
      done()
    })
  })

  describe('when no body is given', function () {
    it('should return null', function (done) {
      createBodylessRequest('', function (req) {
        assert.strictEqual(typeis(req), null)
        assert.strictEqual(typeis(req, ['image/*']), null)
        assert.strictEqual(typeis(req, 'image/*', 'text/*'), null)
        done()
      })
    })
  })

  describe('when no content type is given', function () {
    it('should return false', function (done) {
      createRequest('', function (req) {
        assert.strictEqual(typeis(req), false)
        assert.strictEqual(typeis(req, ['image/*']), false)
        assert.strictEqual(typeis(req, ['text/*', 'image/*']), false)
        done()
      })
    })
  })

  describe('give no types', function () {
    it('should return the mime type', function (done) {
      createRequest('image/png', function (req) {
        assert.equal(typeis(req), 'image/png')
        done()
      })
    })
  })

  describe('given one type', function () {
    it('should return the type or false', function (done) {
      createRequest('image/png', function (req) {
        assert.equal(typeis(req, ['png']), 'png')
        assert.equal(typeis(req, ['.png']), '.png')
        assert.equal(typeis(req, ['image/png']), 'image/png')
        assert.equal(typeis(req, ['image/*']), 'image/png')
        assert.equal(typeis(req, ['*/png']), 'image/png')

        assert.strictEqual(typeis(req, ['jpeg']), false)
        assert.strictEqual(typeis(req, ['.jpeg']), false)
        assert.strictEqual(typeis(req, ['image/jpeg']), false)
        assert.strictEqual(typeis(req, ['text/*']), false)
        assert.strictEqual(typeis(req, ['*/jpeg']), false)

        assert.strictEqual(typeis(req, ['bogus']), false)
        assert.strictEqual(typeis(req, ['something/bogus*']), false)
        done()
      })
    })
  })

  describe('given multiple types', function () {
    it('should return the first match or false', function (done) {
      createRequest('image/png', function (req) {
        assert.equal(typeis(req, ['png']), 'png')
        assert.equal(typeis(req, '.png'), '.png')
        assert.equal(typeis(req, ['text/*', 'image/*']), 'image/png')
        assert.equal(typeis(req, ['image/*', 'text/*']), 'image/png')
        assert.equal(typeis(req, ['image/*', 'image/png']), 'image/png')
        assert.equal(typeis(req, 'image/png', 'image/*'), 'image/png')

        assert.strictEqual(typeis(req, ['jpeg']), false)
        assert.strictEqual(typeis(req, ['.jpeg']), false)
        assert.strictEqual(typeis(req, ['text/*', 'application/*']), false)
        assert.strictEqual(typeis(req, ['text/html', 'text/plain', 'application/json']), false)
        done()
      })
    })
  })

  describe('given +suffix', function () {
    it('should match suffix types', function (done) {
      createRequest('application/vnd+json', function (req) {
        assert.equal(typeis(req, '+json'), 'application/vnd+json')
        assert.equal(typeis(req, 'application/vnd+json'), 'application/vnd+json')
        assert.equal(typeis(req, 'application/*+json'), 'application/vnd+json')
        assert.equal(typeis(req, '*/vnd+json'), 'application/vnd+json')
        assert.strictEqual(typeis(req, 'application/json'), false)
        assert.strictEqual(typeis(req, 'text/*+json'), false)
        done()
      })
    })
  })

  describe('given "*/*"', function () {
    describe('should match any content-type', function () {
      it('text/html', function (done) {
        createRequest('text/html', function (req) {
          assert.equal(typeis(req, '*/*'), 'text/html')
          done()
        })
      })

      it('text/xml', function (done) {
        createRequest('text/xml', function (req) {
          assert.equal(typeis(req, '*/*'), 'text/xml')
          done()
        })
      })

      it('application/json', function (done) {
        createRequest('application/json', function (req) {
          assert.equal(typeis(req, '*/*'), 'application/json')
          done()
        })
      })

      it('application/vnd+json', function (done) {
        createRequest('application/vnd+json', function (req) {
          assert.equal(typeis(req, '*/*'), 'application/vnd+json')
          done()
        })
      })
    })

    it('should not match invalid content-type', function (done) {
      createRequest('bogus', function (req) {
        assert.strictEqual(typeis(req, '*/*'), false)
        done()
      })
    })

    it('should not match body-less request', function (done) {
      createBodylessRequest('text/html', function (req) {
        assert.strictEqual(typeis(req, '*/*'), null)
        done()
      })
    })
  })

  describe('when Content-Type: application/x-www-form-urlencoded', function () {
    it('should match "urlencoded"', function (done) {
      createRequest('application/x-www-form-urlencoded', function (req) {
        assert.equal(typeis(req, ['urlencoded']), 'urlencoded')
        assert.equal(typeis(req, ['json', 'urlencoded']), 'urlencoded')
        assert.equal(typeis(req, ['urlencoded', 'json']), 'urlencoded')
        done()
      })
    })
  })

  describe('when Content-Type: multipart/form-data', function () {
    it('should match "multipart/*"', function (done) {
      createRequest('multipart/form-data', function (req) {
        assert.equal(typeis(req, ['multipart/*']), 'multipart/form-data')
        done()
      })
    })

    it('should match "multipart"', function (done) {
      createRequest('multipart/form-data', function (req) {
        assert.equal(typeis(req, ['multipart']), 'multipart')
        done()
      })
    })
  })
})

describe('typeis.hasBody(req)', function () {
  describe('content-length', function () {
    it('should indicate body', function () {
      var req = {headers: {'content-length': '1'}}
      assert.strictEqual(typeis.hasBody(req), true)
    })

    it('should be true when 0', function (done) {
      createZeroLengthBodyRequest('', function (req) {
        assert.strictEqual(typeis.hasBody(req), true)
        done()
      })
    })

    it('should be false when bogus', function () {
      var req = {headers: {'content-length': 'bogus'}}
      assert.strictEqual(typeis.hasBody(req), false)
    })
  })

  describe('transfer-encoding', function () {
    it('should indicate body', function () {
      var req = {headers: {'transfer-encoding': 'chunked'}}
      assert.strictEqual(typeis.hasBody(req), true)
    })
  })

  if (process.env.HTTP2_TEST) {
    describe('http2 request', function () {
      it('should not indicate body', function (done) {
        createBodylessRequest('', function (req) {
          assert.strictEqual(typeis.hasBody(req), false)
          done()
        })
      })

      it('should not indicate body after end event occurred', function (done) {
        createBodylessRequest('', function (req) {
          var data = ''
          req.on('data', function (chunk) {
            data += chunk
          })
          req.on('end', function (chunk) {
            process.nextTick(function () {
              assert.strictEqual(data, '')
              assert.strictEqual(typeis.hasBody(req), false)
              done()
            })
          })
        })
      })

      it('should not indicate body while end event occurred', function (done) {
        createBodylessRequest('', function (req) {
          var data = ''
          req.on('data', function (chunk) {
            data += chunk
          })
          req.on('end', function (chunk) {
            assert.strictEqual(data, '')
            assert.strictEqual(typeis.hasBody(req), false)
            done()
          })
        })
      })

      it('should indicate body', function (done) {
        createRequest('', function (req) {
          assert.strictEqual(typeis.hasBody(req), true)
          done()
        })
      })

      it('should indicate body after end event occurred', function (done) {
        createRequest('', function (req) {
          var data = ''
          req.on('data', function (chunk) {
            data += chunk
          })
          req.on('end', function (chunk) {
            process.nextTick(function () {
              assert.strictEqual(data, 'hello')
              assert.strictEqual(typeis.hasBody(req), true)
              done()
            })
          })
        })
      })

      it('should indicate body while end event occurred', function (done) {
        createRequest('', function (req) {
          var data = ''
          req.on('data', function (chunk) {
            data += chunk
          })
          req.on('end', function (chunk) {
            assert.strictEqual(data, 'hello')
            assert.strictEqual(typeis.hasBody(req), true)
            done()
          })
        })
      })

      it('should indicate body while data event', function (done) {
        createRequest('', function (req) {
          req.on('data', function (chunk) {
            assert.strictEqual(typeis.hasBody(req), true)
            done()
          })
        })
      })
    })
  }
})

function createRequest (type, callback) {
  if (process.env.HTTP2_TEST) {
    var server = http2.createServer(function (req, res) {
      callback(req)
      server.close()
    })

    server = server.listen(function () {
      var s = new Readable()
      s.push('hello')
      s.push(null)

      var session = http2.connect('http://localhost:' + server.address().port)
      var headers = {
        ':path': '/',
        ':method': 'post',
        'content-type': type || undefined
      }
      var request = session.request(headers)
      s.pipe(request)
    })
  } else {
    var req = {
      headers: {
        'content-type': type || '',
        'transfer-encoding': 'chunked'
      }
    }
    callback(req)
  }
}

function createBodylessRequest (type, callback) {
  if (process.env.HTTP2_TEST) {
    var server = http2.createServer(function (req, res) {
      callback(req)
      server.close()
    })

    server = server.listen(function () {
      var session = http2.connect('http://localhost:' + server.address().port)
      var headers = {
        ':path': '/',
        ':method': 'get',
        'content-type': type || ''
      }
      var option = {
        endStream: true
      }
      session.request(headers, option)
    })
  } else {
    var req = {
      headers: {
        'content-type': type || ''
      }
    }
    callback(req)
  }
}

function createZeroLengthBodyRequest (type, callback) {
  if (process.env.HTTP2_TEST) {
    var server = http2.createServer(function (req, res) {
      callback(req)
      server.close()
    })

    server = server.listen(function () {
      var session = http2.connect('http://localhost:' + server.address().port)
      var headers = {
        ':path': '/',
        ':method': 'get',
        'content-type': type || ''
      }
      var request = session.request(headers)
      request.end()
    })
  } else {
    var req = {
      headers: {
        'content-type': type || '',
        'content-length': 0
      }
    }
    callback(req)
  }
}
