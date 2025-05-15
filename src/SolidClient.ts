import { Agent } from 'undici';
import {
  Fetcher,
  graph,
  UpdateManager,
  AutoInitOptions,
  IndexedFormula,
  sym,
  Namespace,
  isNamedNode,
  st,
} from 'rdflib';
// import { executeUpdate } from "@solid-data-modules/rdflib-utils";
import ChatsModuleRdfLib, {
  ChatsModule,
  PostMessageCommand,
} from '@solid-data-modules/chats-rdflib';
import { Tub } from './tub.js';
import { ChannelDrop, AuthorDrop, MessageDrop } from './drops.js';
import { fetchTracker } from './solid/tasks.js';
import { getFetcher } from './solid/fetcher.js';

const owl = Namespace('http://www.w3.org/2002/07/owl#');

// setGlobalDispatcher(new Agent({bodyTimeout: 0}));

export class SolidClient {
  fetch: typeof globalThis.fetch;
  store: IndexedFormula;
  fetcher: Fetcher;
  updater: UpdateManager;
  module: ChatsModule;
  tub: Tub;
  constructor(tub: Tub) {
    this.tub = tub;
    setInterval(() => {
      this.fetchChat();
    }, 5000);
  }
  async connect(): Promise<void> {
    console.log(`Connecting to Solid...`);
    this.fetch = await getFetcher();
    this.initSolidDataModule();
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
  dropToSolidChatMessage(drop: MessageDrop): PostMessageCommand {
    return {
      chatUri: process.env.CHANNEL_IN_SOLID,
      text: drop.text,
      authorWebId:
        drop.authorId ||
        'https://michielbdejong.solidcommunity.net/profile/card#me',
    };
  }
  solidChatMessageToDrop(entry: {
    uri: string;
    text: string;
    date: Date;
    authorWebId: string;
  }): MessageDrop {
    return {
      localId: entry.uri,
      foreignIds: {},
      model: 'message',
      text: entry.text,
      date: entry.date,
      authorId: entry.authorWebId,
      channelId: process.env.CHANNEL_IN_SOLID,
    } as MessageDrop;
  }
  async createOnPlatform(drop: MessageDrop): Promise<void> {
    console.log('creating on Solid:', drop);
    if (drop.model === 'message') {
      const solidChatMessage = this.dropToSolidChatMessage(drop);
      console.log(solidChatMessage);
      drop.localId = await this.module.postMessage(solidChatMessage);
      const promises = Object.keys(drop.foreignIds).map(async (platform) => {
        const messageNode = sym(drop.localId);
        await this.updater.updateMany(
          [],
          [
            st(
              messageNode,
              owl('sameAs'),
              sym(
                `https://tubsproject.org/id/${platform}/${drop.model}/${drop.foreignIds[platform]}`,
              ),
              messageNode.doc(),
            ),
          ],
        );
      });
      await Promise.all(promises);
      console.log('Created on Solid as:', drop.localId);
      this.tub.addObject(drop); // writing back the localId that was minted
    }
    // console.log(`added message to Solid chat`, messageUri);
  }
  async foreignIdAdded(
    model: string,
    localId: string,
    foreignPlatform: string,
    foreignId: string,
  ): Promise<void> {
    if (
      localId === 'https://michielbdejong.solidcommunity.net/profile/card#me'
    ) {
      return; // this leads to a 500 error, it seems
    }
    const messageNode = sym(localId);
    await this.updater.updateMany(
      [],
      [
        st(
          messageNode,
          owl('sameAs'),
          sym(
            `https://tubsproject.org/id/${foreignPlatform}/${model}/${foreignId}`,
          ),
          messageNode.doc(),
        ),
      ],
    );
  }
  entryToDrops(entry: {
    uri: string;
    text: string;
    date: Date;
    authorWebId: string;
  }): [ChannelDrop, AuthorDrop, MessageDrop] {
    const channelDrop: ChannelDrop = {
      localId: process.env.CHANNEL_IN_SOLID,
      foreignIds: {},
      model: 'channel',
    };
    const authorDrop: AuthorDrop = {
      localId: entry.authorWebId,
      foreignIds: {},
      model: 'author',
    };
    const messageDrop: MessageDrop = this.solidChatMessageToDrop(entry);
    const sameAsNodes = this.store.each(
      sym(entry.uri),
      owl('sameAs'),
      null,
      sym(entry.uri).doc(),
    );
    // console.log(`found sameAsNode for ${entry.uri}`, sameAsNodes);
    for (let i = 0; i < sameAsNodes.length; i++) {
      if (
        isNamedNode(sameAsNodes[i]) &&
        sameAsNodes[i].value.startsWith('https://tubsproject.org/id/')
      ) {
        const parts = sameAsNodes[i].value.split('/');
        // `https://tubsproject.org/id/${otherPlatform}/message/bla`
        //    0   1   2             3        4            5     6
        const otherPlatform = parts[4];
        messageDrop.foreignIds[otherPlatform] = sameAsNodes[i].value.substring(
          `https://tubsproject.org/id/${otherPlatform}/message/`.length,
        );
      }
    }
    // console.log('entryToDrops', entry, channelDrop, authorDrop, messageDrop);
    return [channelDrop, authorDrop, messageDrop];
  }
  initSolidDataModule(): void {
    this.store = graph();
    this.updater = new UpdateManager(this.store);
    this.fetcher = new Fetcher(this.store, {
      fetch: this.fetch,
    } as AutoInitOptions);
    this.module = new ChatsModuleRdfLib({
      store: this.store,
      fetcher: this.fetcher,
      updater: this.updater,
    });
  }
  async fetchChat(): Promise<void> {
    this.initSolidDataModule();
    // if (this.fetcher) {
    //   console.log('fetching todayDoc');
    //   await this.fetcher.load(this.getTodayDoc(process.env.CHANNEL_IN_SOLID));
    //   console.log('done fetching todayDoc');
    // } else {
    //   console.error('no fetcher?');
    // }
    const {
      latestMessages,
    }: {
      uri: string;
      name: string;
      latestMessages: {
        uri: string;
        text: string;
        date: Date;
        authorWebId: string;
      }[];
    } = await this.module.readChat(process.env.CHANNEL_IN_SOLID);
    // console.log(latestMessages);
    await Promise.all(
      latestMessages.map(async (entry) => {
        const [channelDrop, authorDrop, messageDrop] = this.entryToDrops(entry);
        if (typeof messageDrop.channelId !== 'string') {
          console.error(
            'weird, no channel found for this entry of latestMessages from the chat SDM?',
            entry,
          );
        }
        console.log('Solid incoming:', messageDrop.text);
        this.tub.addObjects([channelDrop, authorDrop, messageDrop]);
      }),
    );
  }
  async fetchTracker(): Promise<void> {
    return fetchTracker(process.env.TRACKER_IN_SOLID, this.fetch);
  }
  async listen(): Promise<void> {
    this.tub.on('create', this.createOnPlatform.bind(this));
    this.tub.on('foreign-id-added', this.foreignIdAdded.bind(this));
    const topic = process.env.CHANNEL_IN_SOLID;
    this.tub.addObject({ localId: topic, foreignIds: {}, model: 'channel' });
    const todayDoc = this.getTodayDoc(topic);
    // FIXME: discover this URL from the response header link:
    const streamingUrl = `https://solidcommunity.net/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(todayDoc)}`;
    // console.log('Fetching Solid streaming URL');
    const res = await this.fetch(streamingUrl, {
      dispatcher: new Agent({ bodyTimeout: 0 }),
    } as RequestInit);
    // console.log('Setting up stream listener');
    const textStream = res.body.pipeThrough(new TextDecoderStream());
    // let doneOne = false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _notificationText of textStream as unknown as {
      [Symbol.asyncIterator](): AsyncIterableIterator<string>;
    }) {
      // console.log(notificationText);
      // console.log('fetching chat!');
      this.fetchChat();
    }
    // console.log('Outside stream listener\'s for-await loop');
  }
}
