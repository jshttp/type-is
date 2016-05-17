
var assert = require('assert')
var typeis = require('..')

describe('typeis(req, type)', function () {
  it('should ignore params', function () {
    var req = createRequest('text/html; charset=utf-8')
    assert.equal(typeis(req, ['text/*']), 'text/html')
  })

  it('should ignore params LWS', function () {
    var req = createRequest('text/html ; charset=utf-8')
    assert.equal(typeis(req, ['text/*']), 'text/html')
  })

  it('should ignore casing', function () {
    var req = createRequest('text/HTML')
    assert.equal(typeis(req, ['text/*']), 'text/html')
  })

  it('should fail invalid type', function () {
    var req = createRequest('text/html**')
    assert.strictEqual(typeis(req, ['text/*']), false)
  })

  it('should not match invalid type', function () {
    var req = createRequest('text/html')
    assert.strictEqual(typeis(req, ['text/html/']), false)
    assert.strictEqual(typeis(req, [undefined, null, true, function () {}]), false)
  })

  describe('when no body is given', function () {
    it('should return null', function () {
      var req = {headers: {}}

      assert.strictEqual(typeis(req), null)
      assert.strictEqual(typeis(req, ['image/*']), null)
      assert.strictEqual(typeis(req, 'image/*', 'text/*'), null)
    })
  })

  describe('when no content type is given', function () {
    it('should return false', function () {
      var req = createRequest()
      assert.strictEqual(typeis(req), false)
      assert.strictEqual(typeis(req, ['image/*']), false)
      assert.strictEqual(typeis(req, ['text/*', 'image/*']), false)
    })
  })

  describe('give no types', function () {
    it('should return the mime type', function () {
      var req = createRequest('image/png')
      assert.equal(typeis(req), 'image/png')
    })
  })

  describe('given one type', function () {
    it('should return the type or false', function () {
      var req = createRequest('image/png')

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
    })
  })

  describe('given multiple types', function () {
    it('should return the first match or false', function () {
      var req = createRequest('image/png')

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
    })
  })

  describe('given +suffix', function () {
    it('should match suffix types', function () {
      var req = createRequest('application/vnd+json')

      assert.equal(typeis(req, '+json'), 'application/vnd+json')
      assert.equal(typeis(req, 'application/vnd+json'), 'application/vnd+json')
      assert.equal(typeis(req, 'application/*+json'), 'application/vnd+json')
      assert.equal(typeis(req, '*/vnd+json'), 'application/vnd+json')
      assert.strictEqual(typeis(req, 'application/json'), false)
      assert.strictEqual(typeis(req, 'text/*+json'), false)
    })
  })

  describe('given "*/*"', function () {
    it('should match any content-type', function () {
      assert.equal(typeis(createRequest('text/html'), '*/*'), 'text/html')
      assert.equal(typeis(createRequest('text/xml'), '*/*'), 'text/xml')
      assert.equal(typeis(createRequest('application/json'), '*/*'), 'application/json')
      assert.equal(typeis(createRequest('application/vnd+json'), '*/*'), 'application/vnd+json')
    })

    it('should not match invalid content-type', function () {
      assert.strictEqual(typeis(createRequest('bogus'), '*/*'), false)
    })

    it('should not match body-less request', function () {
      var req = {headers: {'content-type': 'text/html'}}
      assert.strictEqual(typeis(req, '*/*'), null)
    })
  })

  describe('when Content-Type: application/x-www-form-urlencoded', function () {
    it('should match "urlencoded"', function () {
      var req = createRequest('application/x-www-form-urlencoded')

      assert.equal(typeis(req, ['urlencoded']), 'urlencoded')
      assert.equal(typeis(req, ['json', 'urlencoded']), 'urlencoded')
      assert.equal(typeis(req, ['urlencoded', 'json']), 'urlencoded')
    })
  })

  describe('when Content-Type: multipart/form-data', function () {
    it('should match "multipart/*"', function () {
      var req = createRequest('multipart/form-data')

      assert.equal(typeis(req, ['multipart/*']), 'multipart/form-data')
    })

    it('should match "multipart"', function () {
      var req = createRequest('multipart/form-data')

      assert.equal(typeis(req, ['multipart']), 'multipart')
    })
  })
})

describe('typeis.hasBody(req)', function () {
  describe('content-length', function () {
    it('should indicate body', function () {
      var req = {headers: {'content-length': '1'}}
      assert.strictEqual(typeis.hasBody(req), true)
    })

    it('should be true when 0', function () {
      var req = {headers: {'content-length': '0'}}
      assert.strictEqual(typeis.hasBody(req), true)
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
})

function createRequest (type) {
  return {
    headers: {
      'content-type': type || '',
      'transfer-encoding': 'chunked'
    }
  }
}
