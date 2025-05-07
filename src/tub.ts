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
  async createDoc(): Promise<string> {
    this.docHandle = this.repo.create();
    this.doc = await this.docHandle.doc();
    console.log(`this.doc created in ${this.name}`, typeof this.doc);
    this.docHandle.on('change', this.handleChange.bind(this));
    console.log(`doc created in repo ${this.name}`, this.docHandle.documentId);
    return this.docHandle.documentId;
  }
  async setDoc(docUrl: string): Promise<void> {
    console.log(`finding doc in repo ${this.name}`, docUrl);
    this.docHandle = this.repo.find(docUrl as any);
    this.doc = await this.docHandle.doc();
    console.log(`this.doc created in ${this.name}`, typeof this.doc);
    this.docHandle.on('change', this.handleChange.bind(this));
    do {
      console.log(`waiting for doc ${this.name} to be ready`);
      await new Promise((x) => setTimeout(x, 1000));
    } while (!this.docHandle.isReady());
    console.log(`doc ${this.name} is ready`);
  }
  async setDictValue(dict: string, key: string, value: any): Promise<void> {
    this.docHandle.change((d) => {
      if (typeof d[dict] === 'undefined') {
        d[dict] = {};
      }
      d[dict][key] = value;
    });
    this.doc = await this.docHandle.doc();
    console.log(`this.doc updated in ${this.name}`, typeof this.doc);
    return value;
  }
  async getDictValue(dict: string, key: string): Promise<any> {
    if (
      typeof this.doc[dict] === 'undefined' ||
      typeof this.doc[dict][key] === 'undefined'
    ) {
      return this.setDictValue(dict, key, randomUUID());
    }
    return this.doc[dict][key];
  }
  async getId(localId: string): Promise<string> {
    return this.getDictValue('index', localId);
  }
  async setData(uuid: string, value: unknown): Promise<void> {
    return this.setDictValue('objects', uuid, value);
  }
}

export function makeLocalId(parts: string[]): string {
  return parts.join(':');
}
