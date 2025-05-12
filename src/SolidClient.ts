import { Agent } from 'undici';
import { v7 } from "css-authn";
import { Fetcher, graph, UpdateManager, AutoInitOptions, IndexedFormula, sym, Namespace, isNamedNode, st } from "rdflib";
// import { executeUpdate } from "@solid-data-modules/rdflib-utils";
import ChatsModuleRdfLib, { ChatsModule } from "@solid-data-modules/chats-rdflib";
import { Tub } from "./tub.js";
import { MessageDrop } from "./drops.js";

const owl = Namespace("http://www.w3.org/2002/07/owl#");


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
    this.store = graph();
    this.updater = new UpdateManager(this.store);
  }
  async connect(): Promise<void> {
    console.log(`Connecting to Solid...`);
    const authenticatedFetch = await v7.getAuthenticatedFetch({
      email: process.env.SOLID_EMAIL,
      password: process.env.SOLID_PASSWORD,
      provider: process.env.SOLID_SERVER,
    });
    this.fetch = (...args): Promise<Response> => {
      // console.log('fetching!', args);
      return authenticatedFetch.apply(this, args);
    };
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
  async createOnPlatform(drop: MessageDrop): Promise<void> {
    // console.log('creating on Solid:', model, tubsId);
    // const localizedObject = await this.tub.getLocalizedObject({ model, tubsId });
    // const slackId = this.tub.getLocalId({ model: 'message', platform: 'slack', tubsId });
    // const authorWebId = 'https://michielbdejong.solidcommunity.net/profile/card#me';
    // https://github.com/solid-contrib/data-modules/blob/17aadadd17ae74906de1526b62cba32b8fc6cd36/chats/rdflib/src/index.ts#L84
    if (drop.model === 'message') {
      const solidChatMessage = {
        chatUri: process.env.CHANNEL_IN_SOLID,
        text: drop.text,
        authorWebId: drop.authorId || 'https://michielbdejong.solidcommunity.net/profile/card#me',
      };
      console.log(solidChatMessage);
      drop.localId = await this.module.postMessage(solidChatMessage);
      const promises = Object.keys(drop.foreignIds ).map( async (platform) => {
        const messageNode = sym(drop.localId);
        await this.updater.updateMany([], [
          st(messageNode, owl("sameAs"), sym(`https://tubsproject.org/id/${platform}/message/${drop.foreignIds[platform]}`), messageNode.doc()),
        ]);
      });
      await Promise.all(promises);

      this.tub.addObject(drop); // writing back the localId that was minted
    }
    // console.log(`added message to Solid chat`, messageUri);
  }
  async foreignIdAdded(localId: string, foreignPlatform: string, foreignId: string): Promise<void> {
    const messageNode = sym(localId);
    await this.updater.updateMany([], [
      st(messageNode, owl("sameAs"), sym(`https://tubsproject.org/id/${foreignPlatform}/message/${foreignId}`), messageNode.doc()),
    ]);
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
      dispatcher: new Agent({bodyTimeout: 0})
    } as RequestInit);
    // console.log('Setting up stream listener');
    const textStream = res.body.pipeThrough(new TextDecoderStream());
    // let doneOne = false;
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
      // const localIndexKey = this.tub.getIndexKey({ model: 'channel', localId: topic });
      // const tubsChannelId = this.tub.getId(localIndexKey, equivalences[localIndexKey.join(':')], true);
      await Promise.all(latestMessages.map(async (entry) => {
        // if (doneOne) {
        //   return;
        // } else {
        //   doneOne = true;
        // }
  
        // const messageKey = this.tub.getIndexKey({ model: 'message', localId: entry.uri });
        // console.log('getting Id for message', messageKey);
        // const tubsMsgId = this.tub.getId(messageKey, undefined, true);
        // const authorKey = this.tub.getIndexKey({ model: 'author', localId: entry.authorWebId});
        // console.log('getting Id for author', authorKey);
        // const tubsAuthorId = this.tub.getId(authorKey, undefined, true);
        const drop = {
          localId: entry.uri,
          foreignIds: {},
          model: 'message',
          text: entry.text,
          date: entry.date,
          authorId: entry.authorWebId,
          channelId: topic,
        } as MessageDrop;
        const sameAsNodes = this.store.each(
          sym(entry.uri),
          owl('sameAs'),
          null,
          sym(entry.uri).doc(),
        );
        // console.log(`found sameAsNode for ${entry.uri}`, sameAsNodes);
        for (let i = 0; i < sameAsNodes.length; i++) {
          if (isNamedNode(sameAsNodes[i]) && sameAsNodes[i].value.startsWith('https://tubsproject.org/id/')) {
            const parts = sameAsNodes[i].value.split('/');
            // `https://tubsproject.org/id/${otherPlatform}/message/bla`
            //    0   1   2             3        4            5     6
            const otherPlatform = parts[4];
            drop.foreignIds[otherPlatform] = sameAsNodes[i].value.substring(`https://tubsproject.org/id/${otherPlatform}/message/`.length);
          }
        }
        console.log(drop.foreignIds);
        if (typeof drop.channelId === 'string') {
          // console.log('setting message object', tubsMsgId, obj);
          this.tub.addObject(drop);
        } else {
          console.error('weird, no channel found for this entry of latestMessages from the chat SDM?', entry);
        }
      }));
    }
    // console.log('Outside stream listener\'s for-await loop');
  }  
}