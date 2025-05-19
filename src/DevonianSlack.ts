import { DevonianClient, DevonianIndex, ForeignIds } from 'devonian';
const bolt = await import('@slack/bolt');
const App = bolt.default.App;

const BOLT_PORT = 7000;

export type SlackMetadata = {
  event_type: 'devonian',
  event_payload: {
    foreignIds: ForeignIds
  },
}

export type SlackMessage = {
  ts?: string,
  user?: string,
  channel: string,
  text: string,
  metadata: {
   devonian: ForeignIds,
  },
};

export function slackMetadataToForeignIds(metadata:  {
  event_type: string;
  event_payload: {
    foreignIds?: object;
  };
} | undefined): object {
  if (metadata?.event_payload?.foreignIds) {
    return metadata.event_payload.foreignIds;
  }
  return {};
}

export class SlackMessageClient extends DevonianClient<SlackMessage> {
  index: DevonianIndex;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private app: any;
  constructor(index: DevonianIndex) {
    super();
    this.index = index;
    this.on('add', (obj: SlackMessage) => {
      console.log('incoming slack message');
      this.storeIdentitiesFromSlack(obj);
    });
    this.app = new App({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_USER_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
      port: BOLT_PORT,
    });
  }

  storeIdentitiesFromSlack(input: SlackMessage): void {
    // if (typeof input.metadata === 'object' && input.metadata.event_type === 'devonian') {
    //   const foreignIds = input.metadata.event_payload.foreignIds || {};
      this.index.storeIdentitiesFrom('message', 'slack', input.ts, input.metadata.devonian);
    // }
  }

  async add(obj: SlackMessage): Promise<string> {
    this.storeIdentitiesFromSlack(obj);
    const created = await this.app.client.chat.postMessage({
      text: obj.text,
      channel: obj.channel,
      metadata: obj.metadata,
    });
    if (created.ok) {
      obj.ts = created.ts;
      // const localKey = this.tub.getIndexKey({ model: 'message', localId: created.ts });
      // this.tub.setLocalId(localKey, tubsId);
      // console.log('writing back localId from Slack creation', drop);
      console.log('Stored on Slack as:', obj.ts);
      // this.tub.addObject('message', obj);
    }
    return 'ts';
  }
}
    
