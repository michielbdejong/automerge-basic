/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Repo, DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

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