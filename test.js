
var should = require('should');
var assert = require('assert');

var is = require('./')

function req(type) {
  return {
    headers: {
      'content-type': type || '',
      'transfer-encoding': 'chunked'
    }
  }
}

describe('is(req, type)', function(){
  it('should ignore params', function(){
    is(req('text/html; charset=utf-8'), ['text/*'])
    .should.equal('text/html');
  })

  describe('when no body is given', function(){
    it('should return null', function(){
      var req = {headers: {}}

      assert(null == is(req));
      assert(null == is(req, ['image/*']));
      assert(null == is(req, ['image/*', 'text/*']));
    })
  })

  describe('when no content type is given', function(){
    it('should return false', function(){
      is(req()).should.be.false;
      is(req(), ['image/*']).should.be.false;
      is(req(), ['text/*', 'image/*']).should.be.false;
    })
  })

  describe('give no types', function(){
    it('should return the mime type', function(){
      is(req('image/png')).should.equal('image/png');
    })
  })

  describe('given one type', function(){
    it('should return the type or false', function(){
      var r = req('image/png')

      is(r, ['png']).should.equal('png');
      is(r, ['.png']).should.equal('.png');
      is(r, ['image/png']).should.equal('image/png');
      is(r, ['image/*']).should.equal('image/png');
      is(r, ['*/png']).should.equal('image/png');

      is(r, ['jpeg']).should.be.false;
      is(r, ['.jpeg']).should.be.false;
      is(r, ['image/jpeg']).should.be.false;
      is(r, ['text/*']).should.be.false;
      is(r, ['*/jpeg']).should.be.false;
    })
  })

  describe('given multiple types', function(){
    it('should return the first match or false', function(){
      var r = req('image/png')

      is(r, ['png']).should.equal('png');
      is(r, ['.png']).should.equal('.png');
      is(r, ['text/*', 'image/*']).should.equal('image/png');
      is(r, ['image/*', 'text/*']).should.equal('image/png');
      is(r, ['image/*', 'image/png']).should.equal('image/png');
      is(r, ['image/png', 'image/*']).should.equal('image/png');

      is(r, ['jpeg']).should.be.false;
      is(r, ['.jpeg']).should.be.false;
      is(r, ['text/*', 'application/*']).should.be.false;
      is(r, ['text/html', 'text/plain', 'application/json']).should.be.false;
    })
  })

  describe('when Content-Type: application/x-www-form-urlencoded', function(){
    it('should match "urlencoded"', function(){
      var r = req('application/x-www-form-urlencoded')

      is(r, ['urlencoded']).should.equal('urlencoded');
      is(r, ['json', 'urlencoded']).should.equal('urlencoded');
      is(r, ['urlencoded', 'json']).should.equal('urlencoded');
    })
  })
})