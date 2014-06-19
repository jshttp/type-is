
var should = require('should');
var assert = require('assert');

var typeis = require('..')

function req(type) {
  return {
    headers: {
      'content-type': type || '',
      'transfer-encoding': 'chunked'
    }
  }
}

describe('typeis(req, type)', function(){
  it('should ignore params', function(){
    typeis(req('text/html; charset=utf-8'), ['text/*'])
    .should.equal('text/html');
  })

  describe('when no body is given', function(){
    it('should return null', function(){
      var req = {headers: {}}

      assert(null == typeis(req));
      assert(null == typeis(req, ['image/*']));
      assert(null == typeis(req, 'image/*', 'text/*'));
    })
  })

  describe('when no content type is given', function(){
    it('should return false', function(){
      typeis(req()).should.be.false;
      typeis(req(), ['image/*']).should.be.false;
      typeis(req(), ['text/*', 'image/*']).should.be.false;
    })
  })

  describe('give no types', function(){
    it('should return the mime type', function(){
      typeis(req('image/png')).should.equal('image/png');
    })
  })

  describe('given one type', function(){
    it('should return the type or false', function(){
      var r = req('image/png')

      typeis(r, ['png']).should.equal('png');
      typeis(r, ['.png']).should.equal('.png');
      typeis(r, ['image/png']).should.equal('image/png');
      typeis(r, ['image/*']).should.equal('image/png');
      typeis(r, ['*/png']).should.equal('image/png');

      typeis(r, ['jpeg']).should.be.false;
      typeis(r, ['.jpeg']).should.be.false;
      typeis(r, ['image/jpeg']).should.be.false;
      typeis(r, ['text/*']).should.be.false;
      typeis(r, ['*/jpeg']).should.be.false;

      typeis(r, ['bogus']).should.be.false;
    })
  })

  describe('given multiple types', function(){
    it('should return the first match or false', function(){
      var r = req('image/png')

      typeis(r, ['png']).should.equal('png');
      typeis(r, '.png').should.equal('.png');
      typeis(r, ['text/*', 'image/*']).should.equal('image/png');
      typeis(r, ['image/*', 'text/*']).should.equal('image/png');
      typeis(r, ['image/*', 'image/png']).should.equal('image/png');
      typeis(r, 'image/png', 'image/*').should.equal('image/png');

      typeis(r, ['jpeg']).should.be.false;
      typeis(r, ['.jpeg']).should.be.false;
      typeis(r, ['text/*', 'application/*']).should.be.false;
      typeis(r, ['text/html', 'text/plain', 'application/json']).should.be.false;
    })
  })

  describe('given +suffix', function(){
    it('should match suffix types', function(){
      var r = req('application/vnd+json')

      typeis(r, '+json').should.equal('application/vnd+json')
      typeis(r, 'application/vnd+json').should.equal('application/vnd+json')
      typeis(r, 'application/*+json').should.equal('application/vnd+json')
      typeis(r, '*/vnd+json').should.equal('application/vnd+json')
      typeis(r, 'application/json').should.be.false
      typeis(r, 'text/*+json').should.be.false
    })
  })

  describe('when Content-Type: application/x-www-form-urlencoded', function(){
    it('should match "urlencoded"', function(){
      var r = req('application/x-www-form-urlencoded')

      typeis(r, ['urlencoded']).should.equal('urlencoded');
      typeis(r, ['json', 'urlencoded']).should.equal('urlencoded');
      typeis(r, ['urlencoded', 'json']).should.equal('urlencoded');
    })
  })

  describe('when Content-Type: multipart/form-data', function(){
    it('should match "multipart/*"', function(){
      var r = req('multipart/form-data');

      typeis(r, ['multipart/*']).should.equal('multipart/form-data');
    })

    it('should match "multipart"', function(){
      var r = req('multipart/form-data');

      typeis(r, ['multipart']).should.equal('multipart');
    })
  })
})

describe('typeis.hasBody(req)', function(){
  describe('content-length', function(){
    it('should indicate body', function(){
      var req = {headers: {'content-length': '1'}}
      typeis.hasBody(req).should.be.true
    })

    it('should be false when 0', function(){
      var req = {headers: {'content-length': '0'}}
      typeis.hasBody(req).should.be.false
    })

    it('should be false when bogus', function(){
      var req = {headers: {'content-length': 'bogus'}}
      typeis.hasBody(req).should.be.false
    })
  })

  describe('transfer-encoding', function(){
    it('should indicate body', function(){
      var req = {headers: {'transfer-encoding': 'chunked'}}
      typeis.hasBody(req).should.be.true
    })
  })
})
