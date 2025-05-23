import { DevonianClient, IdentifierMap, DevonianModel } from 'devonian';
import { SolidClient } from './SolidClient.js';
import { sym } from 'rdflib';

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

export type SolidMessageWithoutId = DevonianModel & {
  chatUri: string;
  text: string;
  authorWebId: string;
  date?: Date;
  foreignIds: IdentifierMap;
};

export type SolidMessage = SolidMessageWithoutId & {
  uri: string;
};

export class SolidMessageClient extends DevonianClient<SolidMessageWithoutId, SolidMessage> {
  solidClient: SolidClient;
  constructor(solidClient: SolidClient) {
    super();
    this.solidClient = solidClient;
    
  }
  async connect(): Promise<void> {
    await this.solidClient.ensureConnected();
    const todayDoc = getTodayDoc(process.env.CHANNEL_IN_SOLID);
    console.log('fetching todayDoc', todayDoc);
    this.solidClient.subscribe(todayDoc, async () => {
      await this.solidClient.fetcher.load(sym(todayDoc), { force: true });
      const chat = await this.solidClient.chatsModule.readChat(process.env.CHANNEL_IN_SOLID);
      void chat
      chat.latestMessages.map((entry) => {
        this.emit(
          'add-from-client',
          Object.assign(entry, {
            chatUri: process.env.CHANNEL_IN_SOLID,
            foreignIds: this.solidClient.getIdentifierMap(entry.uri),
          }),
        );
      });
    });
  }
  async add(obj: SolidMessageWithoutId): Promise<SolidMessage> {
    const uri = await this.solidClient.chatsModule.postMessage(obj);
    console.log('posted to Solid', obj, uri);
    this.solidClient.storeIdentifierMap(uri, obj.foreignIds);
    return Object.assign(obj, { uri });
  }
}
