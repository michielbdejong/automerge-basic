import { describe, it, expect } from 'vitest';
import { LocalizedDrop } from '../../src/drops.js';
import { createTubs } from '../../src/tub.js';

type FooDrop = LocalizedDrop & {
  foo: string,
  bazId: string,
};

describe('Tub', async () => {
  const tubs = await createTubs(['one', 'two'], [ {}, {} ]);

  it('can fire a change event', async () => {
    const drop: FooDrop = {
      localId: 'test',
      model: 'cow',
      foreignIds: {
      },
      foo: 'bar',
      bazId: '15',
    };
    const fired = new Promise((resolve) => {
      tubs[1].on('create', (drop: LocalizedDrop) => {
        resolve(drop);;
      });
    });
    await tubs[0].addObject(drop);
    const onTwo = await fired as FooDrop;
    expect(onTwo).toEqual({
       bazId: undefined,
       foo: 'bar',
       foreignIds: {
         one: 'test',
         tubs: onTwo.foreignIds.tubs,
       },
       localId: undefined,
       model: 'cow',
    });
  });
});