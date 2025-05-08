import { v7 } from "css-authn";
import {Fetcher, graph, UpdateManager, AutoInitOptions, IndexedFormula } from "rdflib";
import ChatsModuleRdfLib, { ChatsModule } from "@solid-data-modules/chats-rdflib";
import { Tub, Equivalences } from "./tub.js";

export class SolidClient {
  fetch: typeof globalThis.fetch;
  store: IndexedFormula;
  fetcher: Fetcher;
  updater: UpdateManager;
  module: ChatsModule;
  constructor() {
    this.store = graph();
    this.updater = new UpdateManager(this.store);
  }
  async connect(): Promise<void> {
    console.log(`Connnecting to Solid...`);
    this.fetch = await v7.getAuthenticatedFetch({
      email: process.env.SOLID_EMAIL,
      password: process.env.SOLID_PASSWORD,
      provider: process.env.SOLID_SERVER,
    });
    // 1️⃣ create rdflib store, fetcher and updater as usual
    this.fetcher = new Fetcher(
      this.store,
      { fetch: this.fetch } as AutoInitOptions,
    );

    // 2️⃣ create the chats module
    this.module = new ChatsModuleRdfLib({
      store: this.store,
      fetcher: this.fetcher,
      updater: this.updater,
    });
    console.log(`Connnected to Solid ${process.env.SOLID_SERVER}`);
  }

  async createChat(containerUri: string, name: string): Promise<string> {
    console.log(`Creating Solid chat ${name} in ${containerUri}`);

    console.log(`Calling Solid chat data module`);
    // 3️⃣ use the module to interact with chats
    const uri = await this.module.createChat({
      containerUri,
      name,
    });
    console.log(`Created Solid chat ${uri}`);
    return uri;
  }
  // async readChat(chatUri: string): Promise<object> {
  //   return this.module.readChat(chatUri);
  // }
  getTodayDoc(chatUri: string): string {
    // FIXME: expose this code from https://github.com/solid-contrib/data-modules/blob/main/chats/rdflib/src/module/uris/mintMessageUri.ts
    if (!chatUri.endsWith('index.ttl#this')) {
      throw new Error(`Chat URI ${chatUri} does not end with the expected index.ttl#this, is it really the URI of a LongChat?`);
    }
    // note that this relies on server clocks being in sync
    const date = new Date();
    const dateFolders = date.toISOString().split("T")[0].replace(/-/g, "/");
    const containerUri = chatUri.substring(0, chatUri.length - `index.ttl#this`.length);
    return containerUri + dateFolders + "/chat.ttl";
  }
  
  async listen(tub: Tub, equivalences: Equivalences): Promise<void> {
    const topic = process.env.CHANNEL_IN_SOLID;
    const todayDoc = this.getTodayDoc(topic);
    const streamingUrl = `https://solidcommunity.net/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(todayDoc)}`;
    // console.log('Fetching Solid streaming URL');
    const res = await this.fetch(streamingUrl);
    // console.log('Setting up stream listener');
    const textStream = res.body.pipeThrough(new TextDecoderStream());
    for await (const notificationText of textStream as unknown as {
      [Symbol.asyncIterator](): AsyncIterableIterator<string>;
    }) {
      console.log(notificationText);
      // const docRes = await this.fetch(todayDoc, {
      //   headers: {
      //     Accept: 'application/ld+json',
      //   },
      // });
      // const chatChannel = await docRes.json();
      const { latestMessages }: {
        uri: string,
        name: string,
        latestMessages: { uri: string, text: string, date: Date, authorWebId: string }[],
      } = await this.module.readChat(topic);
      const localId = tub.getIndexKey({ model: 'channel', localId: topic });
      const tubsChannelId = await tub.getId(localId, equivalences[localId.join(':')]);
      await Promise.all(latestMessages.map(async (entry) => {
        const messageKey = tub.getIndexKey({ model: 'message', localId: entry.uri });
        // console.log('getting Id for message', messageKey);
        const tubsMsgId = await tub.getId(messageKey);
        const authorKey = tub.getIndexKey({ model: 'author', localId: entry.authorWebId});
        // console.log('getting Id for author', authorKey);
        const authorId = await tub.getId(authorKey);
        const obj = {
          id: tubsMsgId,
          text: entry.text,
          date: entry.date,
          authorId: authorId,
          channel: tubsChannelId,
        };
        console.log('setting message object', tubsMsgId, obj);
        tub.setData(tub.getObjectKey({ model: 'message', tubsId: tubsMsgId }), obj);
      }));
    }
    // console.log('Outside stream listener\'s for-await loop');
  }  
}