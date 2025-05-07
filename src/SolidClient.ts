import { v7 } from "css-authn";
import {Fetcher, graph, UpdateManager, AutoInitOptions, IndexedFormula } from "rdflib";
import ChatsModuleRdfLib, { ChatsModule } from "@solid-data-modules/chats-rdflib";
import { makeLocalId, Tub } from "./tub.js";

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
  async readChat(chatUri: string): Promise<object> {
    return this.module.readChat(chatUri);
  }
  
  async listen(tub: Tub): Promise<void> {
    const topic = process.env.SOLID_TOPIC;
    const streamingUrl = `https://solidcommunity.net/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(topic)}`;
    console.log('Fetching Solid streaming URL');
    const res = await this.fetch(streamingUrl);
    console.log('Setting up stream listener');
    const textStream = res.body.pipeThrough(new TextDecoderStream());
    for await (const notificationText of textStream as unknown as {
      [Symbol.asyncIterator](): AsyncIterableIterator<string>;
    }) {
      console.log(notificationText);
      const docRes = await this.fetch(topic, {
        headers: {
          Accept: 'application/ld+json',
        },
      });
      const chatChannel = await docRes.json();
      const tubsChannelId = await tub.getId(makeLocalId(['solid', 'channel', topic]));
      await Promise.all(chatChannel.map(async (entry) => {
        if (entry['@id'].startsWith(topic)) {
          if (Array.isArray(entry['http://rdfs.org/sioc/ns#content']) && entry['http://rdfs.org/sioc/ns#content'].length === 1) {
            console.log(entry['@id'], entry['http://rdfs.org/sioc/ns#content'][0]['@value']);
            const msgId = await tub.getId(makeLocalId(['solid', 'message', entry['@id']]));
            tub.setData(msgId, {
              id: msgId,
              text: entry['http://rdfs.org/sioc/ns#content'][0]['@value'],
              channel: tubsChannelId,
            });
          }
        }
      }));
    }
    console.log('Outside stream listener\'s for-await loop');
  }  
}