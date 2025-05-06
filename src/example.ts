import { Repo, DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

const repo = new Repo({
  network: [ ],
  storage: new NodeFSStorageAdapter('./data'),
});
const docHandle: DocHandle<{ [index: string]: string }> = repo.create();
docHandle.on('change', ({ doc } : DocHandleChangePayload<{ [index: string]: string }>): void => {
  console.log(`new doc contents in stand-alone repo is`, JSON.stringify(doc, null, 2));
});
console.log('1');
docHandle.change(d => {
  d['foo'] = 'bar';
});
console.log('2');
const doc = await docHandle.doc();
console.log(doc['foo']);
console.log(doc.foo);
console.log('3');