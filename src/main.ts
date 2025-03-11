/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

const repo1 = new Repo({
  network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
  storage: new NodeFSStorageAdapter('./data'),
});

const repo2 = new Repo({
  network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
  storage: new NodeFSStorageAdapter('./data'),
});
async function run(): Promise<void> {
  const doc1 = repo1.create();
  doc1.on('change', ({ doc }) => {
    console.log("new text in repo 1 is", (doc as any).text);
  });
  const doc2 = repo2.find(doc1.documentId);
  doc2.on('change', ({ doc }) => {
    console.log("new text in repo 2 is", (doc as any).text);
  });
  console.log('setting doc text in repo 1');
  doc1.change((d: { text: string }) => {
    d.text = 'hello'
  });
  do {
    console.log('waiting for doc2 to be ready');
    await new Promise(x => setTimeout(x, 1000));
  } while (!doc2.isReady());
  console.log('changing doc in repo 2');
  doc2.change((d: { text: string }) => {
    d.text += ' world'
  });
}

// ...
run();