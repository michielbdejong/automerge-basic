// import { next as A } from "@automerge/automerge";
import { Repo } from "@automerge/automerge-repo";
import { WebSocketServer } from "ws";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

const wss = new WebSocketServer({ noServer: true });

new Repo({
  network: [new NodeWSServerAdapter(wss)],
  storage: new NodeFSStorageAdapter('./data'),
});
