import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidLoginCode} from '../src/auth-code.js';

test('accepts exactly six numeric login code digits', () => {
  assert.equal(isValidLoginCode('123456'), true);
  assert.equal(isValidLoginCode(' 123456 '), true);
  assert.equal(isValidLoginCode('12345'), false);
  assert.equal(isValidLoginCode('12345a'), false);
});
