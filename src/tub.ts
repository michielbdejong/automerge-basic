/* eslint-disable  @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { DocHandle } from '@automerge/automerge-repo';
import {
  NestedDoc,
  getDocEntry,
  setDocEntry,
  createRepo,
  getIndexKey,
  getObjectKey,
} from './utils.js';
import {
  Equivalences,
  LocalEquivalences,
  equivalencesToLocalEquivalences,
} from './equivalences.js';
import {
  LocalizedDrop,
  InternalDrop,
  localizedDropToInternal,
  internalDropToLocalized,
} from './drops.js';
// import { LocalizedDrop, localizedDropToInternal } from './drops.js';

// example, depending on .env, the Slack Tub could have this Equivalences object:
// {
//   "channel": {
//     "C08RR60N1H9": {
//       "solid": "https://michielbdejong.solidcommunity.net/IndividualChats/nlnet-demo/index.ttl#this"
//     }
//   }
// }

export type Column = {
  name: string;
  type: string;
}

export type IndexColumn = Column & {
  isIndex: true
};

export type RelationColumn = Column & {
  isRelation: true
  toTable: string;
};

export type Table = {
  name: string,
  columns: (Column | IndexColumn | RelationColumn)[],
  canStoreMetadata: boolean,
};


export class Tub extends EventEmitter {
  tables: Table[];
  docHandle: DocHandle<unknown>;
  platform: string;
  creating: {
    [tubsId: string]: boolean;
  } = {};
  equivalences: LocalEquivalences;
  timer: ReturnType<typeof setTimeout> | undefined;
  constructor(platform: string, equivalences: Equivalences) {
    super();
    this.platform = platform;
    this.equivalences = equivalencesToLocalEquivalences(equivalences, platform);
    // console.log('local equivalences', platform, this.equivalences);
    setInterval(() => {
      console.log(`Checking coverage for ${this.platform}`);
      this.checkCoverage();
    }, 10000);
  }
  addTable(t: Table) {
    this.tables.push(t);
  }
  private checkIndexCoverage(): void {
    // if there is an index for this platform that also exists on another platform,
    // emit an event to trigger a check if that foreignId is linked.
  }
  private identifierToLocal(model: string, tubsId: string): string {
    const objectKey = getObjectKey({ model, tubsId });
    const object = this.getDictValue(objectKey);
    // console.log('identifierToLocal looking at platformIds', this.platform, model, tubsId);
    return object
      ? (object as InternalDrop).platformIds[this.platform]
      : undefined;
  }
  private checkObjectCoverage(): void {
    // console.log(`checking object coverage on ${this.platform}`, JSON.stringify(this.docHandle.docSync(), null, 2));
    try {
      // console.log('in try');
      const models = Object.keys(this.docHandle.docSync()['objects']);
      // console.log('models', models);
      models.forEach((model) => {
        // console.log(`Checking ${model} object coverage on ${this.platform}`);
        const uuids = Object.keys(this.docHandle.docSync()['objects'][model]);
        uuids.forEach((tubsId) => {
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
            const internalDrop = this.getDictValue(objectKey);
            // console.log('localizing drop in object coverage check', this.platform);
            const localizedDrop = internalDropToLocalized(
              this.platform,
              internalDrop,
              this.identifierToLocal.bind(this),
            );

            if (typeof localizedDrop.localId === 'undefined') {
              // console.log('fire!', localizedDrop);
              this.emit('create', localizedDrop);
            } else {
              const indexKey = getIndexKey({
                platform: this.platform,
                model: localizedDrop.model,
                localId: localizedDrop.localId,
              });
              // console.log('setting dict value', indexKey, tubsId);
              this.setDictValue(indexKey, tubsId);
              Object.keys(localizedDrop.foreignIds).forEach((platform) => {
                this.emit(
                  'foreign-id-added',
                  localizedDrop.model,
                  localizedDrop.localId,
                  platform,
                  localizedDrop.foreignIds[platform],
                );
              });
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
      // if (typeof this.timer === 'undefined') {
      //   this.timer = setTimeout(() => {
      //     this.checkCoverage();
      //     this.timer = undefined;
      //   }, 1000);
      // }
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
  private setDictValue(key: string[], value: any): void {
    // console.log('setDictValue', key, altKey, value);
    this.docHandle.change((d: NestedDoc) => {
      setDocEntry(d, key, value);
      // console.log('doc changed inside callback!', d);
    });
    // console.log(`this.docHandle.docSync() updated in ${this.platform}`, this.docHandle.docSync());
    return value;
  }
  private getDictValue(key: string[]): any {
    return getDocEntry(this.docHandle.docSync(), key);
  }
  private getLocalId({
    model,
    tubsId,
    platform,
  }: {
    model: string;
    tubsId: string;
    platform?: string;
  }): string | undefined {
    if (!platform) {
      platform = this.platform;
    }
    // console.log(`checking type of doc['index'][${platform}][${model}]:`, this.docHandle.docSync());
    if (
      typeof this.docHandle.docSync()['index'] === 'object' &&
      typeof this.docHandle.docSync()['index'][platform] === 'object' &&
      typeof this.docHandle.docSync()['index'][platform][model] === 'object'
    ) {
      // console.log(`Getting ${model} ids for ${platform}`);
      const localIds = Object.keys(
        this.docHandle.docSync()['index'][platform][model],
      );
      // console.log(`Searching through`, localIds);
      for (let i = 0; i < localIds.length; i++) {
        const localId = localIds[i];
        // console.log('Considering', localId, this.docHandle.docSync()['index'][platform][model][localId], tubsId);
        if (
          this.docHandle.docSync()['index'][platform][model][localId] === tubsId
        ) {
          // console.log('yes', tubsId);
          return localId;
          // } else {
          //   console.log('no', tubsId);
        }
      }
    }
    return undefined;
  }
  getObject({
    model,
    localId,
  }: {
    model: string;
    localId: string;
  }): LocalizedDrop | undefined {
    // console.log('getObject', this.platform, model, localId, JSON.stringify(this.docHandle.docSync(), null, 2));
    if (typeof this.docHandle.docSync()['index'] === 'undefined') {
      // console.log('case 1');
      return undefined;
    }
    if (
      typeof this.docHandle.docSync()['index'][this.platform] === 'undefined'
    ) {
      // console.log('case 2');
      return undefined;
    }
    if (
      typeof this.docHandle.docSync()['index'][this.platform][model] ===
      'undefined'
    ) {
      // console.log('case 3');
      return undefined;
    }
    if (
      typeof this.docHandle.docSync()['index'][this.platform][model][
        localId
      ] === 'undefined'
    ) {
      // console.log('case 4');
      return undefined;
    }
    const tubsId =
      this.docHandle.docSync()['index'][this.platform][model][localId];
    if (typeof this.docHandle.docSync()['objects'] === 'undefined') {
      // console.log('case 5');
      return undefined;
    }
    // console.log('case 6');
    const objectKey = getObjectKey({ model, tubsId });
    const internalDrop = this.getDictValue(objectKey);
    // console.log('localizing drop in getObject', this.platform, internalDrop, JSON.stringify(this.docHandle.docSync(), null, 2));
    return internalDropToLocalized(
      this.platform,
      internalDrop,
      this.identifierToLocal.bind(this),
    );
  }
  addObject(drop: LocalizedDrop): void {
    if (
      typeof this.equivalences[drop.model] !== 'undefined' &&
      typeof this.equivalences[drop.model][drop.localId] !== 'undefined'
    ) {
      Object.keys(this.equivalences[drop.model][drop.localId]).forEach(
        (foreignPlatform: string) => {
          if (
            typeof drop.foreignIds[foreignPlatform] !== 'undefined' &&
            drop.foreignIds[foreignPlatform] !==
              this.equivalences[drop.model][drop.localId][foreignPlatform]
          ) {
            throw new Error(
              `Foreign Id for ${foreignPlatform} clashes with this Tub's equivalences`,
            );
          }
          drop.foreignIds[foreignPlatform] =
            this.equivalences[drop.model][drop.localId][foreignPlatform];
        },
      );
    }
    const internalDrop = localizedDropToInternal(
      this.platform,
      drop,
      (model: string, localId: string): string => {
        const indexKey = getIndexKey({
          platform: this.platform,
          model,
          localId,
        });
        let tubsId = this.getDictValue(indexKey);
        if (typeof tubsId === 'undefined') {
          tubsId = this.setDictValue(indexKey, randomUUID());
          const objectKey = getObjectKey({ model, tubsId });
          this.setDictValue(objectKey, {
            tubsId,
            model,
            platformIds: {
              [this.platform]: localId,
            },
            properties: {},
            relations: {},
          });
        }
        // console.log(`Converted localId for ${model} ${localId} into tubsId ${tubsId}`);
        return tubsId;
      },
    );
    // console.log(`Adding ${drop.model} drop`, drop, internalDrop);
    const indexKey = getIndexKey({
      platform: this.platform,
      model: drop.model,
      localId: drop.localId,
    });
    if (typeof internalDrop.tubsId === 'undefined') {
      throw new Error(
        `Attempt to set undefined tubsId for ` + indexKey.join(':'),
      );
    }
    this.setDictValue(indexKey, internalDrop.tubsId);
    const objectKey = getObjectKey({
      model: drop.model,
      tubsId: internalDrop.tubsId,
    });
    // console.log('writing object', objectKey, internalDrop);
    this.setDictValue(objectKey, internalDrop);
    // console.log('object added', JSON.stringify(this.docHandle.docSync(), null, 2));
  }
  addObjects(drops: LocalizedDrop[]): void {
    drops.forEach((drop) => {
      this.addObject(drop);
    });
  }
}

export async function createTubs(
  names: string[],
  equivalences: Equivalences,
): Promise<Tub[]> {
  if (names.length === 0) {
    return [];
  }

  const tubs = [new Tub(names[0], equivalences)];
  const docUrl = await tubs[0].createDoc();

  for (let i = 1; i < names.length; i++) {
    tubs[i] = new Tub(names[i], equivalences);
    await tubs[i].setDoc(docUrl);
  }
  return tubs;
}
