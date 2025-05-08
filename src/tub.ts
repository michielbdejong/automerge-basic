/* eslint-disable  @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { Repo, DocHandle } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
// import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs';

// this is for virtual objects, that are reflected into local versions on multiple platforms.
// it's a map from local ID in this tub to a single equivalent local ID in some other Tub.
// TODO: allow virtual objects across >2 platforms
// joinedLocalId === localId.join(':')
export type Equivalences = { [joinedLocalId: string]: string[] };

export function setDocEntry(doc:{ [index: string]: any }, nesting: string[], value: any): void {
    console.log('setDocEntry', nesting, value);
    return _setDocEntry(doc, JSON.parse(JSON.stringify(nesting)), value);
}
function _setDocEntry(doc:{ [index: string]: any }, nesting: string[], value: any): void {
    // console.log('setDocEntry 1', doc, nesting, value);
  if (nesting.length === 0) {
    // console.log('setDocEntry 2', doc, nesting, value);
    throw new Error('cannot set value of doc itself');
  } else if (nesting.length === 1) {
    // console.log('setDocEntry 3', doc, nesting, value);
    doc[nesting[0]] = value;
  } else {
    // console.log('setDocEntry 4', doc, nesting, value);
    const firstKey = nesting.shift();
    if (typeof doc[firstKey] === 'undefined') {
      // console.log('setDocEntry 5', doc, nesting, value);
      doc[firstKey] = {};
    }
    // console.log('setDocEntry 6', doc, nesting, value);
    _setDocEntry(doc[firstKey], nesting, value);
  }
  // console.log('setDocEntry 7', doc, nesting, value);
}

export function getDocEntry(doc:{ [index: string]: any }, nesting: string[]): any {
  return _getDocEntry(doc, JSON.parse(JSON.stringify(nesting)));
}
function _getDocEntry(doc:{ [index: string]: any }, nesting: string[]): any {
    // console.log('getDocEntry 1', doc, nesting);
  if (nesting.length === 0) {
    // console.log('getDocEntry 2', doc, nesting);
    return;
  } else if (nesting.length === 1) {
    // console.log('getDocEntry 3', doc, nesting);
    return doc[nesting[0]];
  } else {
    // console.log('getDocEntry 4', doc, nesting);
    const firstKey = nesting.shift();
    if (typeof doc[firstKey] === 'undefined') {
      // console.log('getDocEntry 5', doc, nesting);
      return;
    }
    // console.log('getDocEntry 6', doc, nesting);
    return _getDocEntry(doc[firstKey], nesting);
  }
}

function createRepo(): Repo {
  return new Repo({
    // network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
    network: [new BroadcastChannelNetworkAdapter()],
    storage: new NodeFSStorageAdapter('./data'),
  });
}

export class Tub extends EventEmitter {
  docHandle: DocHandle<unknown>;
  platform: string;
  constructor(platform: string) {
    super();
    this.platform = platform;
  }
  getIndexKey({ model, localId }: { model: string, localId: string}): string[] {
    return [ 'index', this.platform, model, localId ];
  }
  getObjectKey({ model, tubsId }: { model: string, tubsId: string}): string[] {
    return [ 'objects', model, tubsId ];
  }
  
  checkCoverage(): void {
    if (typeof this.docHandle.docSync()['objects'] === 'undefined') {
      console.log('attempt to check coverage on doc without objects', this.docHandle.docSync());
      return;
    }
    console.log('checking coverage', this.docHandle.docSync());
    try {
      const models = Object.keys(this.docHandle.docSync()['objects'])
      models.forEach(model => {
        const uuids = Object.keys(this.docHandle.docSync()['objects'][model]);
        uuids.forEach(tubsId => {
          const localizedId = this.getLocalId({ model, tubsId });
          console.log(`${model} ${tubsId} ${(localizedId === 'undefined' ? 'found' : 'NOT FOUND')} in ${this.platform}`);
          this.emit('create', model, tubsId);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }
  handleChange(): void {
    this.checkCoverage();
    // console.log(
    //   `new doc contents in repo ${this.platform} is`,
    //   JSON.stringify(data.doc, null, 2),
    //   data.patchInfo.source,
    // );
  }
  async setupDoc(): Promise<string> {
    this.docHandle.on('change', this.handleChange.bind(this));
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
  async setDictValue(key: string[], altKey: string[] | undefined, value: any): Promise<void> {
    // console.log('setDictValue', key, altKey, value);
    this.docHandle.change((d) => {
      setDocEntry(d, key, value);
      if (altKey) {
       setDocEntry(d, altKey, value);
      }
      console.log('doc changed inside callback!', d);
    });
    console.log(`this.docHandle.docSync() updated in ${this.platform}`, this.docHandle.docSync());
    return value;
  }
  async ensureCopied(existingKey: string[], otherKey?: string[]): Promise<any> {
    console.log('ensureCopied', existingKey, otherKey);
    const entry = getDocEntry(this.docHandle.docSync(), existingKey);
    if (otherKey && typeof getDocEntry(this.docHandle.docSync(), otherKey) === 'undefined') {
      await this.setDictValue(otherKey, undefined, entry); 
    }
    return entry;
  }
  async getDictValue(key: string[], altKey?: string[], mintIfMissing?: boolean): Promise<any> {
    console.log('getDictValue', key, altKey, mintIfMissing);
 
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
  async getId(localId: string[], altId?: string[], mintIfMissing?: boolean): Promise<string> {
    return this.getDictValue(localId, altId, mintIfMissing);
  }
  getLocalId({ model, tubsId }: { model: string, tubsId: string }): string | undefined {
    if (typeof this.docHandle.docSync()['index'][this.platform][model] === 'object') {
      const localIds = Object.keys(this.docHandle.docSync()['index'][this.platform][model]);
      for (let i = 0; i < localIds.length; i++) {
        const localId = localIds[i];
        if (this.docHandle.docSync()['index'][this.platform][model][localId] === tubsId) {
          return localId;
        }
      }
    }
    return undefined;
  }
  async getLocalizedObject({ model, tubsId }: { model: string, tubsId: string }): Promise<any> {
    const key = this.getObjectKey({ model, tubsId });
    const obj = await this.getDictValue(key);
    console.log('getLocalizedObject; starting from:', model, tubsId, key, obj);
    // for instance if this is a chat message from Solid, it will look like this:
    // {
    //   id: tubsMsgId,
    //   text: entry.text,
    //   date: entry.date,
    //   authorId: tubsAuthorId,
    //   channelId: tubsChannelId,
    // }
    Object.keys(obj).forEach(key => {
      console.log('considering key', key, obj[key]);
      if (key === 'id') {
        obj[key] = this.getLocalId({ model, tubsId: obj[key] });
        console.log('updated', key, obj[key]);
      } else if (key.endsWith('Id')) {
        const relatedModel = key.substring(0, key.length - `Id`.length); 
        obj[key] = this.getLocalId({ model: relatedModel, tubsId: obj[key] });
        console.log('updated', key, obj[key]);
      }
    });
    console.log('returning obj', obj);
    return obj;
  }
  async setData(uuidSpec: string[], value: unknown): Promise<void> {
    return this.setDictValue(uuidSpec, undefined, value);
  }
}

