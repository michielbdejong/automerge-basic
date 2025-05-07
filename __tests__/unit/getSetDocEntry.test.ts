import { describe, it, expect } from 'vitest';
import { getDocEntry, setDocEntry } from '../../src/tub.js';

describe('get/setDocEntry', () => {
  const key = ['a', 'b', 'c'];
  const doc = {};

  it('can set and get', async () => {
    const text = 'hello';
    setDocEntry(doc, key, text);
    const readBack = getDocEntry(doc, key);
    expect(readBack).toBe(text);
  });
});