import { IdentifierMap } from 'devonian';
import {
  Fetcher,
  graph,
  UpdateManager,
  AutoInitOptions,
  IndexedFormula,
  sym,
  st,
  Namespace,
} from 'rdflib';
import { getFetcher } from './solid/fetcher.js';

import ChatsModuleRdfLib, {
  ChatsModule,
} from '@solid-data-modules/chats-rdflib';
const owl = Namespace('http://www.w3.org/2002/07/owl#');

export class SolidClient {
  // private index: DevonianIndex;
  fetch: typeof globalThis.fetch;
  store: IndexedFormula;
  chatsModule: ChatsModule;
  fetcher: Fetcher;
  updater: UpdateManager;
  connecting: Promise<void> | undefined;
  private async connect(): Promise<void> {
    console.log(`Connecting to Solid...`);
    this.fetch = await getFetcher();
    this.store = graph();
    this.updater = new UpdateManager(this.store);
    this.fetcher = new Fetcher(this.store, {
      fetch: this.fetch,
    } as AutoInitOptions);
    this.chatsModule = new ChatsModuleRdfLib({
      store: this.store,
      fetcher: this.fetcher,
      updater: this.updater,
    });    
  }
  async ensureConnected(): Promise<void> {
    if (!this.connecting) {
      this.connecting = this.connect();
    }
    return this.connecting;
  }
  async storeIdentifierMap(uri: string, foreignIds: IdentifierMap): Promise<void> {
    const promises = Object.keys(foreignIds).map(async (platform) => {
      const messageNode = sym(uri);
      await this.updater.updateMany(
        [],
        [
          st(
            messageNode,
            owl('sameAs'),
            sym(
              `https://tubsproject.org/id/message/${platform}/${foreignIds[platform]}`,
            ),
            messageNode.doc(),
          ),
        ],
      );
    });
    await Promise.all(promises);
  }
  getIdentifierMap(uri: string): IdentifierMap {    
    const sameAs = this.store
      .each(sym(uri), owl('sameAs'), null, sym(uri).doc())
      .map((node) => node.value);
    const ret: IdentifierMap = {};
    sameAs.forEach((uri: string) => {
      if (uri.startsWith(`https://tubsproject.org/id/message/`)) {
        const rest = uri.substring(`https://tubsproject.org/id/message/`.length);
        const parts = rest.split('/');
        if (parts.length === 2) {
          ret[parts[0]] = parts[1];
        }
      }
    });
    console.log('converted sameAs uris', sameAs, ret);
    return ret;
  }
}
