import test from 'node:test';
import assert from 'node:assert/strict';
import { setTextIfChanged } from '../src/uiUpdates.ts';

test('repeated frames only write changed status, including after external edits', () => {
  let value = '';
  let writes = 0;
  const element = {
    get textContent() { return value; },
    set textContent(next) { value = next; writes++; }
  };
  for (let frame = 0; frame < 120; frame++) setTextIfChanged(element, '4 fighters left');
  assert.equal(writes, 1);
  setTextIfChanged(element, '3 fighters left');
  assert.equal(writes, 2);
  element.textContent = 'Custom fight ready';
  setTextIfChanged(element, '3 fighters left');
  assert.equal(value, '3 fighters left');
  assert.equal(writes, 4);
});
