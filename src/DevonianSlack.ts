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
    event_type: string,
    event_payload: ForeignIds,
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
  async connect(): Promise<void> {
    this.app.message(async ({ message }) => {
      console.log('emitting add-from-client', message);
      this.emit('add-from-client', message);
    });
    await this.app.start(9999);
  }
  storeIdentitiesFromSlack(input: SlackMessage): void {
      this.index.storeIdentitiesFrom('message', 'slack', input.ts, input.metadata.event_payload);
    // }
  }

  async add(obj: SlackMessage): Promise<string> {
    this.storeIdentitiesFromSlack(obj);
    const created = await this.app.client.chat.postMessage({
      text: obj.text,
      channel: obj.channel,
      metadata: obj.metadata,
    });
    if (!created.ok) {
      throw new Error('Could not post message to Slack');
    }
    return created.ts;
  }
}
