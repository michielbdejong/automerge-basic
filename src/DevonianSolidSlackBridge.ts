import { DevonianTable, DevonianLens } from './DevonianLens.js';
import { DevonianIndex } from './DevonianIndex.js';
import { SolidMessageClient, SolidMessage } from './DevonianSolid.js';
import { SlackMessageClient, SlackMessage } from './DevonianSlack.js';

export class DevonianSolidSlackBridge {
  index = new DevonianIndex();
  solidMessageTable = new DevonianTable<SolidMessage>(new SolidMessageClient(this.index));
  slackMessageTable = new DevonianTable<SlackMessage>(new SlackMessageClient(this.index));

  constructor() {
    new DevonianLens<SlackMessage, SolidMessage>(
      this.solidMessageTable,
      this.slackMessageTable,
      (input: SlackMessage): SolidMessage => {
        // this.storeIdentitiesFromSlack(input);
        return {
          uri: this.index.convert('message', 'slack', input.ts, 'solid'),
          chatUri: this.index.convert('channel', 'slack', input.channel, 'solid'),
          text: input.text,
          authorWebId: this.index.convert('person', 'slack', input.user, 'solid'),
          date: new Date(parseFloat(input.ts) * 1000),
          foreignIds: this.index.convertForeignIds('slack', input.ts, input.foreignIds, 'solid'),
        };
      },
      (input: SolidMessage): SlackMessage => {
        // this.storeIdentitiesFromSolid(input);
        return {
          ts: this.index.convert('message', 'solid', input.uri, 'slack'),
          user: this.index.convert('person', 'solid', input.authorWebId, 'slack'),
          text: input.text,
          channel: this.index.convert('channel', 'solid', input.chatUri, 'slack'),
          foreignIds: this.index.convertForeignIds('solid', input.uri, input.foreignIds, 'slack'),
        };
      },
    );
  }
}
