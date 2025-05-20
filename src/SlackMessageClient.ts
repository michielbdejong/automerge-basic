import { DevonianClient, ForeignIds } from 'devonian';
const bolt = await import('@slack/bolt');
const App = bolt.default.App;

const BOLT_PORT = 7000;

export type SlackMessage = {
  ts?: string;
  user?: string;
  channel: string;
  text: string;
  metadata: {
    event_type: string;
    event_payload: ForeignIds;
  };
};

export class SlackMessageClient extends DevonianClient<SlackMessage> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private app: any;

  async connect(): Promise<void> {
    this.app = new App({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_USER_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
      port: BOLT_PORT,
    });
    this.app.message(async ({ message }) => {
      console.log('emitting add-from-client', message);
      this.emit('add-from-client', message);
    });
    await this.app.start(9999);
  }

  async add(obj: SlackMessage): Promise<string> {
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
