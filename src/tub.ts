/* eslint-disable  @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import { Repo, DocHandle } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
// import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs';

export class Tub {
  repo: Repo;
  docHandle: DocHandle<unknown>;
  doc: {
    [dict: string]: { [key: string]: string };
  };
  name: string;
  constructor(name: string) {
    this.repo = new Repo({
      // network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
      network: [new BroadcastChannelNetworkAdapter()],
      storage: new NodeFSStorageAdapter('./data'),
    });
    this.name = name;
  }
  handleChange({ doc }: { doc: DocHandle<unknown> }): void {
    console.log(
      `new doc contents in repo ${this.name} is`,
      JSON.stringify(doc, null, 2),
    );
  }
  async setupDoc(): Promise<string> {
    this.docHandle.on('change', this.handleChange.bind(this));
    console.log(`doc created in repo ${this.name}`, this.docHandle.documentId);
    while (!this.docHandle.isReady()) {
      console.log(`waiting for doc ${this.name} to be ready`);
      await new Promise((x) => setTimeout(x, 1000));
    }
    console.log(`doc ${this.name} is ready`);
    this.doc = await this.docHandle.doc();
    console.log(`this.doc created in ${this.name}`, typeof this.doc);
    return this.docHandle.documentId;
  }
  async createDoc(): Promise<string> {
    console.log(`creating doc in repo ${this.name}`);
    this.docHandle = this.repo.create();
    return this.setupDoc();
  }
  async setDoc(docUrl: string): Promise<string> {
    console.log(`finding doc in repo ${this.name}`, docUrl);
    this.docHandle = this.repo.find(docUrl as any);
    return this.setupDoc();
  }
  async setDictValue(dict: string, key: string, altKey: string | undefined, value: any): Promise<void> {
    this.docHandle.change((d) => {
      if (typeof d[dict] === 'undefined') {
        d[dict] = {};
      }
      d[dict][key] = value;
      if (altKey) {
        d[dict][altKey] = value;
      }
    });
    this.doc = await this.docHandle.doc();
    console.log(`this.doc updated in ${this.name}`, typeof this.doc);
    return value;
  }
  async ensureCopied(dict: string, existingKey: string, otherKey?: string): Promise<any> {
    if (otherKey && typeof this.doc[dict][otherKey] === 'undefined') {
      await this.setDictValue(dict, otherKey, undefined, this.doc[dict][existingKey]); 
    }
    return this.doc[dict][existingKey];
  }
  async getDictValue(dict: string, key: string, altKey?: string): Promise<any> {
    if (typeof this.doc[dict] === 'undefined') {
      return this.setDictValue(dict, key, altKey, randomUUID());
    }
    if (this.doc[dict][key]) {
      return this.ensureCopied(dict, key, altKey);
    }
    if (this.doc[dict][altKey]) {
      return this.ensureCopied(dict, altKey, key);
    }
    return this.setDictValue(dict, key, altKey, randomUUID());
  }
  async getId(localId: string, altId?: string): Promise<string> {
    return this.getDictValue('index', localId, altId);
  }
  async setData(uuid: string, value: unknown): Promise<void> {
    return this.setDictValue('objects', uuid, undefined, value);
  }
}

export function makeLocalId(parts: string[]): string {
  return parts.join(':');
}
