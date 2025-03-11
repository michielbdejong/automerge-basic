/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Repo } from "@automerge/automerge-repo";
import { WebSocketServer } from "ws";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

const wss = new WebSocketServer({ port: 8080 });

const repo1 = new Repo({
  network: [new NodeWSServerAdapter(wss as any)],
  storage: new NodeFSStorageAdapter('./data'),
});

// const repo2 = new Repo({
//   network: [new NodeWSServerAdapter(wss as any)],
//   storage: new NodeFSStorageAdapter('./data'),
// });

console.log('creating doc');
const doc = repo1.create();
console.log('setting doc text');
doc.change((d: { text: string }) => {
  d.text = 'hello'
});
console.log('waiting for change event');
doc.on('change', ({ doc }) => {
  console.log("new text is", (doc as any).text);
});
console.log('changing doc');
doc.change((d: { text: string }) => {
  d.text += ' world'
});
