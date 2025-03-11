/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Repo } from "@automerge/automerge-repo";
import { WebSocketServer } from "ws";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

const wss = new WebSocketServer({ noServer: true });

new Repo({
  network: [new NodeWSServerAdapter(wss as any)],
  storage: new NodeFSStorageAdapter('./data'),
});
