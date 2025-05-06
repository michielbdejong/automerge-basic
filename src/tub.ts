/* eslint-disable  @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";
import { Repo, DocHandle } from "@automerge/automerge-repo";
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
    let docState = await this.doc.doc();
    if (typeof docState['dataIndex'] === 'undefined') {
      this.doc.change((d: { [key: string]: any }) => {
        d['dataIndex'] = {};
      });
      docState = await this.doc.doc();
    }
    if (typeof docState['dataIndex'][localId] === 'undefined') {
      this.doc.change((d: { [key: string]: any }) => {
        d['dataIndex'][localId] = randomUUID();
      });
      docState = await this.doc.doc();
    }
    console.log('3');
    return docState['dataIndex'][localId];
  }
  setData(uuid: string, value: unknown): void {
    this.doc.change((d: any) => {
      if (typeof d.objects === 'undefined') {
        d.objects = {};
      }
      d.objects[uuid] = value;
    });
  }
}
