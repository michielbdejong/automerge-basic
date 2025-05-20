import { DevonianClient, ForeignIds } from 'devonian';
import { SolidClient } from './SolidClient.js';
import ChatsModuleRdfLib, {
  ChatsModule,
} from '@solid-data-modules/chats-rdflib';
import { Agent } from 'undici';
import {
  sym,
} from 'rdflib';
function getTodayDoc(chatUri: string): string {
  // FIXME: expose this code from https://github.com/solid-contrib/data-modules/blob/main/chats/rdflib/src/module/uris/mintMessageUri.ts
  if (!chatUri.endsWith('index.ttl#this')) {
    throw new Error(
      `Chat URI ${chatUri} does not end with the expected index.ttl#this, is it really the URI of a LongChat?`,
    );
  }
  // note that this relies on server clocks being in sync
  const date = new Date();
  const dateFolders = date.toISOString().split('T')[0].replace(/-/g, '/');
  const containerUri = chatUri.substring(
    0,
    chatUri.length - `index.ttl#this`.length,
  );
  return containerUri + dateFolders + '/chat.ttl';
}

export type SolidMessage = {
  uri?: string;
  chatUri: string;
  text: string;
  authorWebId: string;
  date?: Date;
  foreignIds: ForeignIds;
};

export class SolidMessageClient extends DevonianClient<SolidMessage> {
  solidClient: SolidClient;
  module: ChatsModule;
  constructor(solidClient: SolidClient) {
    super();
    this.solidClient = solidClient;
    this.module = new ChatsModuleRdfLib(this.solidClient);
  }
  async connect(): Promise<void> {
    await this.solidClient.ensureConnected();
    const todayDoc = getTodayDoc(process.env.CHANNEL_IN_SOLID);
    // FIXME: discover this URL from the response header link:
    const streamingUrl = `https://solidcommunity.net/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(todayDoc)}`;
    const res = await this.solidClient.fetch(streamingUrl, {
      dispatcher: new Agent({ bodyTimeout: 0 }),
    } as RequestInit);
    for await (const _notificationText of res.body.pipeThrough(
      new TextDecoderStream(),
    ) as unknown as {
      [Symbol.asyncIterator](): AsyncIterableIterator<string>;
    }) {
      void _notificationText;
      await this.solidClient.fetcher.load(sym(todayDoc), { force: true });
      const chat = await this.module.readChat(process.env.CHANNEL_IN_SOLID);
      chat.latestMessages.map((entry) => {
        this.emit(
          'add-from-client',
          Object.assign(entry, {
            chatUri: process.env.CHANNEL_IN_SOLID,
            foreignIds: this.solidClient.getForeignIds(entry.uri),
          }),
        );
      });
    }
  }
  async add(obj: SolidMessage): Promise<string> {
    const uri = await this.module.postMessage(obj);
    console.log('posted to Solid', obj, uri);
    this.solidClient.storeForeignIds(uri, obj.foreignIds);
    return uri;
  }
}
