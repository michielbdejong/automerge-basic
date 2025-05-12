import { describe, it, expect } from 'vitest';
import { LocalizedDrop } from '../../src/drops.js';
import { createTubs } from '../../src/tub.js';

type FooDrop = LocalizedDrop & {
  foo: string,
  bazId: string,
};

describe('Tub', async () => {
  const tubs = await createTubs(['one', 'two'], {
    horse: [{
      one: 'test',
      two: 'yup',
    }],
  });

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
    tubs[0].addObject(drop);
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
  it('can understand equivalences', async () => {
    const drop: FooDrop = {
      localId: 'test',
      model: 'horse',
      foreignIds: {
      },
      foo: 'bar',
      bazId: '15',
    };
    let fired = false;
    tubs[1].on('create', () => {
      fired = true;
    });
    tubs[0].addObject(drop);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fired).toEqual(false);
    const onTwo = tubs[1].getObject({ model: 'horse', localId: 'yup' });
    expect(onTwo).toEqual({
     bazId: undefined,
     foo: 'bar',
     foreignIds: {
       one: 'test',
       tubs: onTwo.foreignIds.tubs,
     },
     localId: 'yup',
     model: 'horse',
    });
  });
});