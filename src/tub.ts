/* eslint-disable  @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import { Repo, DocHandle } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
// import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs';

export type LocalIdSpec = {
  model: string,
  localId: string
};


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

  idSpecToStr(from: LocalIdSpec): string {
    console.log(`Tub ${this.platform} converting IdSpec to string`, from);
    return `${this.platform}:${from.model}:${from.localId}`;
  }

  handleChange(data: { doc: DocHandle<unknown>, patchInfo: { before: object, after: object, source: string } }): void {
    console.log(
      `new doc contents in repo ${this.platform} is`,
      JSON.stringify(data.doc, null, 2),
      data.patchInfo.source,
    );
  }
  async setupDoc(): Promise<string> {
    this.docHandle.on('change', this.handleChange.bind(this));
    console.log(`doc created in repo ${this.platform}`, this.docHandle.documentId);
    while (!this.docHandle.isReady()) {
      console.log(`waiting for doc ${this.platform} to be ready`);
      await new Promise((x) => setTimeout(x, 1000));
    }
    console.log(`doc ${this.platform} is ready`);
    this.doc = await this.docHandle.doc();
    console.log(`this.doc created in ${this.platform}`, typeof this.doc);
    return this.docHandle.documentId;
  }
  async createDoc(): Promise<string> {
    console.log(`creating doc in repo ${this.platform}`);
    this.docHandle = this.repo.create();
    return this.setupDoc();
  }
  async setDoc(docUrl: string): Promise<string> {
    console.log(`finding doc in repo ${this.platform}`, docUrl);
    this.docHandle = this.repo.find(docUrl as any);
    return this.setupDoc();
  }
  async setDictValue(dict: string, key: LocalIdSpec, altKey: LocalIdSpec | undefined, value: any): Promise<void> {
    console.log('setDictValue', dict, key, altKey, value);
    this.docHandle.change((d) => {
      if (typeof d[dict] === 'undefined') {
        d[dict] = {};
      }
      d[dict][this.idSpecToStr(key)] = value;
      if (altKey) {
        d[dict][this.idSpecToStr(altKey)] = value;
      }
    });
    this.doc = await this.docHandle.doc();
    console.log(`this.doc updated in ${this.platform}`, typeof this.doc);
    return value;
  }
  async ensureCopied(dict: string, existingKey: LocalIdSpec, otherKey?: LocalIdSpec): Promise<any> {
    console.log('ensureCopied', dict, existingKey, otherKey);

    if (otherKey && typeof this.doc[dict][this.idSpecToStr(otherKey)] === 'undefined') {
      await this.setDictValue(dict, otherKey, undefined, this.doc[dict][this.idSpecToStr(existingKey)]); 
    }
    return this.doc[dict][this.idSpecToStr(existingKey)];
  }
  async getDictValue(dict: string, key: LocalIdSpec, altKey?: LocalIdSpec): Promise<any> {
    console.log('getDictValue', dict, key, altKey);
 
    if (typeof this.doc[dict] === 'undefined') {
      return this.setDictValue(dict, key, altKey, randomUUID());
    }
    if (this.doc[dict][this.idSpecToStr(key)]) {
      return this.ensureCopied(dict, key, altKey);
    }
    if (altKey && this.doc[dict][this.idSpecToStr(altKey)]) {
      return this.ensureCopied(dict, altKey, key);
    }
    return this.setDictValue(dict, key, altKey, randomUUID());
  }
  async getId(localId: LocalIdSpec, altId?: LocalIdSpec): Promise<string> {
    return this.getDictValue('index', localId, altId);
  }
  async setData(uuidSpec: LocalIdSpec, value: unknown): Promise<void> {
    return this.setDictValue('objects', uuidSpec, undefined, value);
  }
}

