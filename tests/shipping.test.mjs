import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDeliveryCoverage } from '../src/lib/shipping.ts';

test('classifies supported local and outstation postcodes consistently', () => {
  assert.deepEqual(getDeliveryCoverage('27600'), { covered: true, region: 'local', postcode: '27600' });
  assert.deepEqual(getDeliveryCoverage('47500'), { covered: true, region: 'local', postcode: '47500' });
  assert.deepEqual(getDeliveryCoverage('81100'), { covered: true, region: 'outstation', postcode: '81100' });
  assert.deepEqual(getDeliveryCoverage('01000'), { covered: true, region: 'outstation', postcode: '01000' });
});

test('rejects East Malaysia and malformed postcodes', () => {
  assert.equal(getDeliveryCoverage('87000').covered, false);
  assert.equal(getDeliveryCoverage('90000').covered, false);
  assert.equal(getDeliveryCoverage('98000').covered, false);
  assert.equal(getDeliveryCoverage('00000').covered, false);
  assert.equal(getDeliveryCoverage('abc').covered, false);
});
