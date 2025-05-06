/* eslint-disable  @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";
import { Repo, DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
// import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

export class Tub {
  repo: Repo;
  doc: DocHandle<unknown>;
  name: string;
  constructor(name: string) {
    this.repo = new Repo({
      // network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
      network: [ new BroadcastChannelNetworkAdapter() ],
      storage: new NodeFSStorageAdapter('./data'),
    });
    this.name = name;
  }
  handleChange({ doc} : { doc: DocHandle<unknown> }): void {
    console.log(`new doc contents in repo ${this.name} is`, JSON.stringify(doc, null, 2));
  }
  createDoc(): string {
    this.doc = this.repo.create();
    this.doc.on('change', this.handleChange.bind(this));
    console.log(`doc created in repo ${this.name}`, this.doc.documentId);
    return this.doc.documentId;
  }
  async setDoc(docUrl: string): Promise<void> {
    console.log(`finding doc in repo ${this.name}`, docUrl);
    this.doc = this.repo.find(docUrl as any);
    this.doc.on('change', this.handleChange.bind(this));
    do {
      console.log(`waiting for doc ${this.name} to be ready`);
      await new Promise(x => setTimeout(x, 1000));
    } while (!this.doc.isReady());
  }
  async getId(localId: string): Promise<string> {
    let minted: string | undefined;
    console.log('1');
    if (typeof this.doc['dataIndex'] === 'undefined') {
      console.log('1a');
      this.doc.change((d: { [key: string]: any }) => {
        minted = randomUUID();
        d['dataIndex'] = {
          [localId]: minted
        };
      });
      console.log('1b');
    }
    console.log('current this.doc', this.doc);
    console.log('2');
    if (typeof this.doc['dataIndex'][localId] === 'undefined') {
      this.doc.change((d: { [key: string]: any }) => {
        minted = randomUUID();
        d['dataIndex'][localId] = minted;
      });
    }
    console.log('3');
    return minted || this.doc['dataIndex'][localId];
  }
  setData(uuid: string, value: unknown): void {
    this.doc.change((d: any) => {
      if (typeof d.objects === 'undefined') {
        d.objects = {};
      }
      d.objects[uuid] = value;
    });
  }
  setText(): void {
    console.log(`Setting doc text in repo ${this.name}`);
    this.doc.change((d: { text: string }) => {
      d.text = 'hello'
    });
  }
  addText(): void {
    console.log(`Changing doc text in repo ${this.name}`);
    this.doc.change((d: { text: string }) => {
      d.text += ' world'
    });
  }
  test(): void {
    console.log('1');
    this.doc.change(d => {
      d['foo'] = 'bar';
    });
    console.log('2');
    console.log(this.doc['foo']);
    console.log('3');
  }
}


// ...
const repo = new Repo({
  network: [ ],
  storage: new NodeFSStorageAdapter('./data'),
});
const doc: DocHandle<unknown> = repo.create();
doc.on('change', ({ doc } : DocHandleChangePayload<unknown>): void => {
  console.log(`new doc contents in stand-alone repo is`, JSON.stringify(doc, null, 2));
});
console.log('1');
doc.change(d => {
  d['foo'] = 'bar';
});
console.log('2');
console.log(doc['foo']);
console.log((doc as any).foo);
console.log('3');