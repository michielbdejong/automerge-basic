

import { IdentityMap } from './drops.js';

export type Equivalences = {
    [model: string]: IdentityMap[],
  };
  export type LocalEquivalences = {
    [model: string]: {
      [localId: string]: IdentityMap,
    },
  };
  
  export function equivalencesToLocalEquivalences(eq: Equivalences, platform: string): LocalEquivalences {
    const ret: LocalEquivalences = {};
    Object.keys(eq).forEach((model: string) => {
      ret[model] = {};
      eq[model].forEach(map => {
        const localId = map[platform];
        if (typeof localId !== 'undefined') {
          const filteredMap = JSON.parse(JSON.stringify(map));
          delete filteredMap[platform];
          ret[model][localId] = filteredMap;
        }
      });
    });
    return ret;
  }
  