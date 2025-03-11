/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Repo, DocHandle } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

class Tub {
  repo: Repo;
  doc: DocHandle<unknown>;
  name: string;
  constructor(name: string) {
    this.repo = new Repo({
      network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
      storage: new NodeFSStorageAdapter('./data'),
    });
    this.name = name;
  }
  createDoc(): string {
    this.doc = this.repo.create();
    this.doc.on('change', ({ doc }) => {
      console.log(`new text in repo ${this.name} is`, (doc as any).text);
    });
    console.log(`doc created in repo ${this.name}`, this.doc.documentId);
    return this.doc.documentId;
  }
  async setDoc(docUrl: string): Promise<void> {
    console.log(`finding doc in repo ${this.name}`, docUrl);
    this.doc = this.repo.find(docUrl as any);
    this.doc.on('change', ({ doc }) => {
      console.log(`new text in repo ${this.name} is`, (doc as any).text);
    });
    do {
      console.log(`waiting for doc ${this.name} to be ready`);
      await new Promise(x => setTimeout(x, 1000));
    } while (!this.doc.isReady());
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
}


async function run(): Promise<void> {
  const tub1 = new Tub('1');
  const tub2 = new Tub('2');
  const docUrl = tub1.createDoc();
  tub1.setText();
  await tub2.setDoc(docUrl);
  tub2.addText();
}

// ...
run();