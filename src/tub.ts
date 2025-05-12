/* eslint-disable  @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { DocHandle } from '@automerge/automerge-repo';
import { NestedDoc, getDocEntry, setDocEntry, createRepo, getIndexKey, getObjectKey } from './utils.js';
import { Equivalences, LocalEquivalences, equivalencesToLocalEquivalences } from './equivalences.js';
import { LocalizedDrop, InternalDrop, localizedDropToInternal, internalDropToLocalized } from './drops.js';
// import { LocalizedDrop, localizedDropToInternal } from './drops.js';

// example, depending on .env, the Slack Tub could have this Equivalences object:
// {
//   "channel": {
//     "C08RR60N1H9": {
//       "solid": "https://michielbdejong.solidcommunity.net/IndividualChats/nlnet-demo/index.ttl#this"
//     }
//   }
// }


export class Tub extends EventEmitter {
  docHandle: DocHandle<unknown>;
  platform: string;
  creating: {
    [tubsId: string]: boolean
  } = {};
  equivalences: LocalEquivalences;
  constructor(platform: string, equivalences: Equivalences) {
    super();
    this.platform = platform;
    this.equivalences = equivalencesToLocalEquivalences(equivalences, platform);
    // console.log('local equivalences', platform, this.equivalences);
    // setInterval(() => {
    //   this.checkCoverage();
    // }, 10000);
  }
  
  private checkIndexCoverage(): void {
    // if there is an index for this platform that also exists on another platform,
    // emit an event to trigger a check if that foreignId is linked.
  }
  private checkObjectCoverage(): void {
    // console.log(`checking object coverage on ${this.platform}`, this.docHandle.docSync());
    try {
      // console.log('in try');
      const models = Object.keys(this.docHandle.docSync()['objects']);
      // console.log('models', models);
      models.forEach(model => {
        // console.log(`Checking ${model} object coverage on ${this.platform}`);
        const uuids = Object.keys(this.docHandle.docSync()['objects'][model]);
        uuids.forEach(tubsId => {
          // console.log(`Checking object coverage for ${model} ${tubsId}`);
          const localId = this.getLocalId({ model, tubsId });
          // console.log('localId', localId);
          // console.log(`On ${this.platform}, ${model} ${tubsId} has localId ${localId}`);
          if (typeof localId === 'undefined') {
            if (this.creating[tubsId]) {
              // console.log(`Already creating ${model} ${tubsId} on ${this.platform}`);
              return;
            }
            this.creating[tubsId] = true;
            const objectKey = getObjectKey({ model, tubsId });
            const internalDrop = this.getDictValue(objectKey, undefined, false);
            const localizedDrop = internalDropToLocalized(this.platform, internalDrop, (model: string, tubsId: string): string => {
              const objectKey = getObjectKey({ model, tubsId });
              const object = this.getDictValue(objectKey, undefined, false);
              return (object ? (object as InternalDrop).platformIds[this.platform] : undefined);
            });

            if (typeof localizedDrop.localId === 'undefined') {
              // console.log('fire!', localizedDrop);
              this.emit('create', localizedDrop);
            }
          }
        });
      });
    } catch (e) {
      console.error(e);
    }
  }
  private checkCoverage(): void {
    // console.log('--------------------');
    // console.log(this.platform);
    // console.log(this.docHandle.docSync());
    // console.log(JSON.stringify(this.docHandle.docSync(), null, 2));
    // console.log('--------------------');
    // console.log(`Checking coverage in ${this.platform} tub`, JSON.stringify(this.docHandle.docSync(), null, 2));
    if (typeof this.docHandle.docSync()['index'] !== 'undefined') {
      this.checkIndexCoverage();
    }
    if (typeof this.docHandle.docSync()['objects'] !== 'undefined') {
      this.checkObjectCoverage();
    }
  }
  private async setupDoc(): Promise<string> {
    // console.log('registering change handler');
    this.docHandle.on('change', () => {
      // console.log('change handler fired');
      this.checkCoverage();
    });
    // console.log(`doc created in repo ${this.platform}`, this.docHandle.documentId);
    while (!this.docHandle.isReady()) {
      // console.log(`waiting for doc ${this.platform} to be ready`);
      await new Promise((x) => setTimeout(x, 1000));
    }
    // console.log(`doc ${this.platform} is ready`);
    await this.docHandle.whenReady();
    // console.log(`this.docHandle.docSync() created in ${this.platform}`, typeof this.docHandle.docSync());
    return this.docHandle.documentId;
  }
  async createDoc(): Promise<string> {
    // console.log(`creating doc in repo ${this.platform}`);
    this.docHandle = createRepo().create();
    return this.setupDoc();
  }
  async setDoc(docUrl: string): Promise<string> {
    // console.log(`finding doc in repo ${this.platform}`, docUrl);
    this.docHandle = createRepo().find(docUrl as any);
    return this.setupDoc();
  }
  private setDictValue(key: string[], altKey: string[] | undefined, value: any): void {
    // console.log('setDictValue', key, altKey, value);
    this.docHandle.change((d: NestedDoc) => {
      setDocEntry(d, key, value);
      if (altKey) {
       setDocEntry(d, altKey, value);
      }
      // console.log('doc changed inside callback!', d);
    });
    // console.log(`this.docHandle.docSync() updated in ${this.platform}`, this.docHandle.docSync());
    return value;
  }
  private ensureCopied(existingKey: string[], otherKey?: string[]): any {
    // console.log('ensureCopied', existingKey, otherKey);
    const entry = getDocEntry(this.docHandle.docSync(), existingKey);
    if (otherKey && typeof getDocEntry(this.docHandle.docSync(), otherKey) === 'undefined') {
      this.setDictValue(otherKey, undefined, entry); 
    }
    return entry;
  }
  private getDictValue(key: string[], altKey?: string[], mintIfMissing?: boolean): any {
    // console.log('getDictValue', key, altKey, mintIfMissing);
 
    if (getDocEntry(this.docHandle.docSync(), key)) {
      return this.ensureCopied(key, altKey);
    }
    if (altKey && getDocEntry(this.docHandle.docSync(), altKey)) {
      return this.ensureCopied(altKey, key);
    }
    if (mintIfMissing) {
      return this.setDictValue(key, altKey, randomUUID());
    }
    return undefined;
  }
  private getLocalId({ model, tubsId, platform }: { model: string, tubsId: string, platform?: string }): string | undefined {
    if (!platform) {
      platform = this.platform;
    }
    // console.log(`checking type of doc['index'][${platform}][${model}]:`, this.docHandle.docSync());
    if ((typeof this.docHandle.docSync()['index'] === 'object') && (typeof this.docHandle.docSync()['index'][platform] === 'object') && (typeof this.docHandle.docSync()['index'][platform][model] === 'object')) {
      // console.log(`Getting ${model} ids for ${platform}`);
      const localIds = Object.keys(this.docHandle.docSync()['index'][platform][model]);
      // console.log(`Searching through`, localIds);
      for (let i = 0; i < localIds.length; i++) {
        const localId = localIds[i];
        // console.log('Considering', localId, this.docHandle.docSync()['index'][platform][model][localId], tubsId);
        if (this.docHandle.docSync()['index'][platform][model][localId] === tubsId) {
          return localId;
        }
      }
    }
    return undefined;
  }
  addObject(drop: LocalizedDrop): void {
    if ((typeof this.equivalences[drop.model] !== 'undefined') && (typeof this.equivalences[drop.model][drop.localId] !== 'undefined')) {
      Object.keys(this.equivalences[drop.model][drop.localId]).forEach((foreignPlatform: string) => {
        if ((typeof drop.foreignIds[foreignPlatform] !== 'undefined') && (drop.foreignIds[foreignPlatform] !== this.equivalences[drop.model][drop.localId][foreignPlatform])) {
          throw new Error(`Foreign Id for ${foreignPlatform} clashes with this Tub's equivalences`);
        }
        drop.foreignIds[foreignPlatform] = this.equivalences[drop.model][drop.localId][foreignPlatform];
      });
    }
    const internalDrop = localizedDropToInternal(this.platform, drop, (model: string, localId: string): string => {
      const indexKey = getIndexKey({ platform: this.platform, model, localId });
      const tubsId = this.getDictValue(indexKey, undefined, true);
      return tubsId;
    });
    // console.log(`Adding ${drop.model} drop`, drop, internalDrop);
    const indexKey = getIndexKey({ platform: this.platform, model: drop.model, localId: drop.localId });
    this.setDictValue(indexKey, undefined, internalDrop.tubsId);
    const objectKey = getObjectKey({ model: drop.model, tubsId: internalDrop.tubsId });
    this.setDictValue(objectKey, undefined, internalDrop);
    // console.log('object added', JSON.stringify(this.docHandle.docSync(), null, 2));
  }
}

export async function createTubs(names: string[], equivalences: Equivalences): Promise<Tub[]> {
  if (names.length === 0) {
    return [];
  }

  const tubs = [
    new Tub(names[0], equivalences),
  ];
  const docUrl = await tubs[0].createDoc();

  for (let i=1; i < names.length; i++) {
    tubs[i] = new Tub(names[i], equivalences);
    await tubs[i].setDoc(docUrl);
  }
  return tubs;
}