/* eslint-disable  @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import { Repo, DocHandle, DocHandleChangePayload } from '@automerge/automerge-repo';
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


export class Tub {
  repo: Repo;
  docHandle: DocHandle<unknown>;
  doc: {
    [dict: string]: { [key: string]: string };
  };
  platform: string;
  constructor(platform: string) {
    this.repo = new Repo({
      // network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
      network: [new BroadcastChannelNetworkAdapter()],
      storage: new NodeFSStorageAdapter('./data'),
    });
    this.platform = platform;
  }
  getIndexKey({ model, localId }: { model: string, localId: string}): string[] {
    return [ 'index', this.platform, model, localId ];
  }
  getObjectKey({ model, tubsId }: { model: string, tubsId: string}): string[] {
    return [ 'objects', model, tubsId ];
  }
  
  checkCoverage(doc: { [index: string]: any }): void {
    if (typeof doc['objects'] === 'undefined') {
      console.log('attempt to check coverage on doc without objects', doc);
      return;
    }
    console.log('checking coverage', doc);
    try {
      const models = Object.keys(doc['objects'])
      models.forEach(model => {
        const uuids = Object.keys(doc['objects'][model]);
        uuids.forEach(uuid => {
          console.log(`Looking for ${model} keys in ${this.platform}`, typeof doc['index'][this.platform][model]);
          
          let found = false;
          if (typeof doc['index'][this.platform][model] === 'object') {
            const localIds = Object.keys(doc['index'][this.platform][model]);
            for (let i = 0; i < localIds.length && !found; i++) {
              if (doc['index'][this.platform][model][i] === uuid) {
                found = true;
              }
            }
          }
          console.log(`${model} ${uuid} ${(found ? 'found' : 'NOT FOUND')} in ${this.platform}`);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }
  handleChange(data: DocHandleChangePayload<unknown>): void {
    this.checkCoverage(data.doc);
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
    this.doc = await this.docHandle.doc();
    // console.log(`this.doc created in ${this.platform}`, typeof this.doc);
    return this.docHandle.documentId;
  }
  async createDoc(): Promise<string> {
    // console.log(`creating doc in repo ${this.platform}`);
    this.docHandle = this.repo.create();
    return this.setupDoc();
  }
  async setDoc(docUrl: string): Promise<string> {
    // console.log(`finding doc in repo ${this.platform}`, docUrl);
    this.docHandle = this.repo.find(docUrl as any);
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
    this.doc = await this.docHandle.doc();
    console.log(`this.doc updated in ${this.platform}`, this.doc);
    return value;
  }
  async ensureCopied(existingKey: string[], otherKey?: string[]): Promise<any> {
    // console.log('ensureCopied', existingKey, otherKey);
    const entry = getDocEntry(this.doc, existingKey);
    if (otherKey && typeof getDocEntry(this.doc, otherKey) === 'undefined') {
      await this.setDictValue(otherKey, undefined, entry); 
    }
    return entry;
  }
  async getDictValue(key: string[], altKey?: string[]): Promise<any> {
    // console.log('getDictValue', key, altKey);
 
    if (getDocEntry(this.doc, key)) {
      return this.ensureCopied(key, altKey);
    }
    if (altKey && getDocEntry(this.doc, altKey)) {
      return this.ensureCopied(altKey, key);
    }
    return this.setDictValue(key, altKey, randomUUID());
  }
  async getId(localId: string[], altId?: string[]): Promise<string> {
    return this.getDictValue(localId, altId);
  }
  async setData(uuidSpec: string[], value: unknown): Promise<void> {
    return this.setDictValue(uuidSpec, undefined, value);
  }
}

