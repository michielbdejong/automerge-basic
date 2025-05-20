// import { DevonianClient, DevonianIndex, ForeignIds } from 'devonian';
import { DevonianClient, ForeignIds } from 'devonian';
// import { Agent } from 'undici';
import {
  Fetcher,
  graph,
  UpdateManager,
  AutoInitOptions,
  IndexedFormula,
  // sym,
  // Namespace,
  // isNamedNode,
  // st,
} from 'rdflib';
// import { executeUpdate } from "@solid-data-modules/rdflib-utils";
import ChatsModuleRdfLib, {
  ChatsModule,
} from '@solid-data-modules/chats-rdflib';
// import { Tub, SolidChatMessage } from './tub.js';
// import { ChannelDrop, AuthorDrop } from './drops.js';
// import { fetchTracker } from './solid/tasks.js';
import { getFetcher } from './solid/fetcher.js';

export function solidSameasToForeignIds(sameAs: string[]): ForeignIds {
  const ret: { [platform: string]: string } = {};
  sameAs.forEach((uri: string) => {
    if (uri.startsWith(`https://tubsproject.org/id/message/`)) {
      const rest = (uri.substring(`https://tubsproject.org/id/message/`.length));
      const parts = rest.split('/');
      if (parts.length === 2) {
        ret[parts[0]] = parts[1]
      }
    }
  });
  return ret;
}

export function foreignIdsToSolidSameas(foreignIds: object): string[] {
  return Object.keys(foreignIds).map(otherPlatform => {
    return `https://tubsproject.org/id/message/${otherPlatform}/${foreignIds[otherPlatform]}`;
  });
}


export type SolidMessage = {
  uri?: string,
  chatUri: string,
  text: string,
  authorWebId: string,
  date?: Date,
  foreignIds: ForeignIds,
};

export class SolidMessageClient extends DevonianClient<SolidMessage> {
  // private index: DevonianIndex;
  fetch: typeof globalThis.fetch;
  store: IndexedFormula;
  fetcher: Fetcher;
  updater: UpdateManager;
  module: ChatsModule;
  // constructor(index: DevonianIndex) {
  constructor() {
    super();
    // this.index = index;
  }
  async connect(): Promise<void> {
    console.log(`Connecting to Solid...`);
    this.fetch = await getFetcher();
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
    latestMessages.map((entry) => {
      this.emit('add-from-client', entry);
    });
  }
  async add(obj: SolidMessage): Promise<string> {
    const ret = await this.module.postMessage(obj);
    console.log('posted to Solid', obj, ret);
    return ret;
  }
}