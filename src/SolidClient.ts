import { Agent } from 'undici';
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
import { v7 } from 'css-authn';
import ChatsModuleRdfLib, {
  ChatsModule,
} from '@solid-data-modules/chats-rdflib';
const owl = Namespace('http://www.w3.org/2002/07/owl#');

async function getFetcher() {
  // console.log('obtaining authenticated fetcher', process.env);
  const authenticatedFetch = await v7.getAuthenticatedFetch({
    email: process.env.SOLID_EMAIL,
    password: process.env.SOLID_PASSWORD,
    provider: process.env.SOLID_SERVER,
  });
  // console.log('obtained authenticated fetcher');
  return (
    ...args: Parameters<typeof authenticatedFetch>
  ): Promise<Response> => {
    console.log('fetching', args[0]);
    return authenticatedFetch.apply(this, args);
  };
}

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
  async subscribe(url: string, callback: (notificationText: string) => void): Promise<void> {
    const streamingUrl = `https://solidcommunity.net/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(url)}`;
    const res = await this.fetch(streamingUrl, {
      dispatcher: new Agent({ bodyTimeout: 0 }),
    } as RequestInit);
    for await (const notificationText of res.body.pipeThrough(
      new TextDecoderStream(),
    ) as unknown as {
      [Symbol.asyncIterator](): AsyncIterableIterator<string>;
    }) {
      callback(notificationText);
    }
  }
}
