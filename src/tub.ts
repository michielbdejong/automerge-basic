/* eslint-disable  @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { DocHandle } from '@automerge/automerge-repo';
import { getDocEntry, setDocEntry, createRepo } from './utils.js';
import { MessageDrop } from './drops.js';

// this is for virtual objects, that are reflected into local versions on multiple platforms.
// it's a map from local ID in this tub to a single equivalent local ID in some other Tub.
// TODO: allow virtual objects across >2 platforms
// joinedLocalId === localId.join(':')
export type Equivalences = { [joinedLocalId: string]: string[] };

export class Tub extends EventEmitter {
  docHandle: DocHandle<unknown>;
  platform: string;
  creating: {
    [tubsId: string]: boolean
  } = {};
  equivalences: Equivalences;
  constructor(platform: string, equivalences: Equivalences) {
    super();
    this.platform = platform;
    this.equivalences = equivalences;
    // setInterval(() => {
    //   this.checkCoverage();
    // }, 10000);
  }
  private getObjectKey({ model, tubsId }: { model: string, tubsId: string}): string[] {
    return [ 'objects', model, tubsId ];
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
          console.log(`On ${this.platform}, ${model} ${tubsId} has localId ${localId}`);
          if (typeof localId === 'undefined') {
            if (this.creating[tubsId]) {
              console.log(`Already creating ${tubsId} on ${this.platform}`);
              return;
            }
            this.creating[tubsId] = true;
            this.emit('create', model, tubsId);
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
    this.docHandle.on('change', () => {
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
    this.docHandle.change((d) => {
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
  private getId(localId: string[], altId?: string[], mintIfMissing?: boolean): string {
    return this.getDictValue(localId, altId, mintIfMissing);
  }
  private getLocalId({ model, tubsId, platform }: { model: string, tubsId: string, platform?: string }): string | undefined {
    if (!platform) {
      platform = this.platform;
    }
    // console.log(`checking type of doc['index'][${platform}][${model}]:`, this.docHandle.docSync());
    if (typeof this.docHandle.docSync()['index'][platform][model] === 'object') {
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
  private getLocalizedObject({ model, tubsId }: { model: string, tubsId: string }): any {
    const key = this.getObjectKey({ model, tubsId });
    const obj = this.getDictValue(key);
    // console.log('getLocalizedObject; starting from:', model, tubsId, key, obj);
    // for instance if this is a chat message from Solid, it will look like this:
    // {
    //   id: tubsMsgId,
    //   text: entry.text,
    //   date: entry.date,
    //   authorId: tubsAuthorId,
    //   channelId: tubsChannelId,
    // }
    Object.keys(obj).forEach(key => {
      // console.log('considering key', key, obj[key]);
      if (key === 'id') {
        obj[key] = this.getLocalId({ model, tubsId: obj[key] });
        // if (typeof obj[key] === 'undefined') {
        //   throw new Error(`could not localize ${key} for ${model} from tubsId value ${tubsId}`);
        // }
        // console.log('updated', key, obj[key]);
      } else if (key.endsWith('Id')) {
        const relatedModel = key.substring(0, key.length - `Id`.length); 
        obj[key] = this.getLocalId({ model: relatedModel, tubsId: obj[key] });
        // if (typeof obj[key] === 'undefined') {
        //   throw new Error(`could not localize ${key} for ${model} from ${relatedModel} tubsId value ${tubsId}`);
        // }
        // console.log('updated', key, obj[key]);
      }
    });
    console.log('returning obj', obj);
    return obj;
  }
  private setData(uuidSpec: string[], value: unknown): void {
    return this.setDictValue(uuidSpec, undefined, value);
  }
  private setLocalId(indexKey: string[], tubsId: string): void {
    this.setDictValue(indexKey, undefined, tubsId);
  }
  addObject({ model, drop }: { model: string, drop: MessageDrop }): void {
    console.log(`Adding ${model} drop`, drop);
  }
  // getNewObjects({ model }: { model: string }): any[] {

  // }
}

