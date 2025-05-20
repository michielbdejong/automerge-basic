import { DevonianClient, DevonianTable, DevonianLens, DevonianIndex } from 'devonian';
import { SolidMessage } from './DevonianSolid.js';
import { SlackMessage } from './DevonianSlack.js';

export class DevonianSolidSlackBridge {
  index: DevonianIndex
  solidMessageTable: DevonianTable<SolidMessage>;
  slackMessageTable: DevonianTable<SlackMessage>;

  constructor(index: DevonianIndex, solidMessageClient: DevonianClient<SolidMessage>, slackMessageClient: DevonianClient<SlackMessage>) {
    this.index = index;
    this.solidMessageTable = new DevonianTable<SolidMessage>(solidMessageClient);
    this.slackMessageTable = new DevonianTable<SlackMessage>(slackMessageClient);
    new DevonianLens<SolidMessage, SlackMessage>(
      this.solidMessageTable,
      this.slackMessageTable,
      (input: SolidMessage): SlackMessage => {
        const ret = {
          ts: this.index.convert('message', 'solid', input.uri, 'slack'),
          user: this.index.convert('person', 'solid', input.authorWebId, 'slack'),
          text: input.text,
          channel: this.index.convert('channel', 'solid', input.chatUri, 'slack'),
          metadata: {
            devonian: this.index.convertForeignIds('solid', input.uri, input.foreignIds, 'slack'),
          },
        };
        // console.log('converting from Solid to Slack', input, ret);
        return ret;
      },
      (input: SlackMessage): SolidMessage => {
        const ret = {
          uri: this.index.convert('message', 'slack', input.ts, 'solid'),
          chatUri: this.index.convert('channel', 'slack', input.channel, 'solid'),
          text: input.text,
          authorWebId: this.index.convert('author', 'slack', input.user, 'solid'),
          date: new Date(parseFloat(input.ts) * 1000),
          foreignIds: input.metadata?.devonian && this.index.convertForeignIds('slack', input.ts, input.metadata.devonian, 'solid'),
        };
        // console.log('converting from Slack to Solid', input, ret);
        return ret;
      },
    );
  }
}
