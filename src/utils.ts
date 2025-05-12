import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
// import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs';
import { Repo } from '@automerge/automerge-repo';
import { InternalDrop } from './drops.js';

export type NestedDoc =
  | { [index: string]: NestedDoc }
  | { [index: string]: InternalDrop };

export function getIndexKey({
  platform,
  model,
  localId,
}: {
  platform: string;
  model: string;
  localId: string;
}): string[] {
  return ['index', platform, model, localId];
}

export function getObjectKey({
  model,
  tubsId,
}: {
  model: string;
  tubsId: string;
}): string[] {
  return ['objects', model, tubsId];
}
export function setDocEntry(
  doc: NestedDoc,
  nesting: string[],
  value: InternalDrop,
): void {
  // console.log('setDocEntry', nesting, value);
  return _setDocEntry(doc, JSON.parse(JSON.stringify(nesting)), value);
}
function _setDocEntry(
  doc: NestedDoc | InternalDrop,
  nesting: string[],
  value: InternalDrop,
): void {
  // console.log('setDocEntry 1', doc, nesting, value);
  if (nesting.length === 0) {
    // console.log('setDocEntry 2', doc, nesting, value);
    throw new Error('cannot set value of doc itself');
  } else if (nesting.length === 1) {
    // console.log('setDocEntry 3', doc, nesting, value);
    doc[nesting[0]] = value;
  } else {
    // console.log('setDocEntry 4', doc, nesting, value);
    const firstKey = nesting.shift();
    if (typeof doc[firstKey] === 'undefined') {
      // console.log('setDocEntry 5', doc, nesting, value);
      doc[firstKey] = {};
    }
    // console.log('setDocEntry 6', doc, nesting, value);
    _setDocEntry(doc[firstKey], nesting, value);
  }
  // console.log('setDocEntry 7', doc, nesting, value);
}

export function getDocEntry(
  doc: NestedDoc,
  nesting: string[],
): InternalDrop | undefined {
  return _getDocEntry(doc, JSON.parse(JSON.stringify(nesting)));
}
function _getDocEntry(
  doc: NestedDoc | InternalDrop,
  nesting: string[],
): InternalDrop | undefined {
  // console.log('getDocEntry 1', doc, nesting);
  if (nesting.length === 0) {
    // console.log('getDocEntry 2', doc, nesting);
    return undefined;
  } else if (nesting.length === 1) {
    // console.log('getDocEntry 3', doc, nesting);
    return doc[nesting[0]];
  } else {
    // console.log('getDocEntry 4', doc, nesting);
    const firstKey = nesting.shift();
    if (typeof doc[firstKey] === 'undefined') {
      // console.log('getDocEntry 5', doc, nesting);
      return undefined;
    }
    // console.log('getDocEntry 6', doc, nesting);
    return _getDocEntry(doc[firstKey], nesting);
  }
}

export function createRepo(): Repo {
  return new Repo({
    // network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
    network: [new BroadcastChannelNetworkAdapter()],
    storage: new NodeFSStorageAdapter('./data'),
  });
}
