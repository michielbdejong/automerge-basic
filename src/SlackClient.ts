import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
const bolt = await import('@slack/bolt');
import { Tub } from './tub.js';
import { ChannelDrop, AuthorDrop, MessageDrop } from './drops.js';

const App = bolt.default.App;

const BOLT_PORT = 7000;
export interface IMessage {
  // client_msg_id: string;
  // type: string;
  text: string;
  user: string;
  ts: string;
  // blocks: Block[];
  // team: string;
  channel: string;
  // event_ts: string;
  // channel_type: string;
  metadata?: {
    event_type?: string,
    event_payload?: {
      foreignIds?: object,
    },
  },
}

export interface Block {
  type: string;
  block_id: string;
  elements: object[];
}

export interface IUserInfo {
  ok: boolean;
  user: User;
}

export interface User {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: { [key: string]: string };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  updated: number;
  is_app_user: boolean;
  has_2fa: boolean;
}

export class SlackClient extends EventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private app: any;
  private logins: { [nonce: string]: string } = {};
  private logouts: { [nonce: string]: string } = {};
  private expressFullUrl: string;
  private tub: Tub;
  constructor(expressFullUrl: string, tub: Tub) {
    super();
    this.app = new App({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_USER_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
      port: BOLT_PORT,
    });
    this.expressFullUrl = expressFullUrl;
    this.tub = tub;
  }
  dropToSlackMessage(drop: MessageDrop): IMessage {
    return {
      ts: drop.localId,
      text: drop.text,
      user: drop.authorId,
      channel: drop.channelId,
      metadata: {
        event_type: 'from_tubs',
        event_payload: {
          foreignIds: drop.foreignIds,
        },
      },
    }
  }
  slackMessageToDrop(message: IMessage): MessageDrop {
    const ret = {
      model: 'message',
      localId: message.ts,
      text: message.text,
      authorId: message.user,
      channelId: message.channel,
      foreignIds: {},
      date: new Date(parseFloat(message.ts) * 1000),
    };
    if (typeof message.metadata?.event_payload?.foreignIds === 'object') {
      ret.foreignIds = message.metadata!.event_payload!.foreignIds
    }
    return ret;
  }
  async createOnPlatform(drop: MessageDrop): Promise<void> {
    // const existing = await this.app.client.search.messages({
    //   metadata: {
    //     event_type: "from_tubs",
    //     event_payload: {
    //       foreignIds: drop.foreignIds,
    //     },
    //   },
    // });
    // console.log(existing);
    // const localizedObject = await this.tub.getLocalizedObject({ model, tubsId });
    // if (typeof localizedObject.channelId === 'undefined') {
    //   console.error(`failed to localize channelId for ${model} ${tubsId}`);
    //   return;
    // }
    if (drop.model !== 'message') {
      return;
    }
    console.log('creating on Slack:', drop);
    // https://docs.slack.dev/reference/methods/chat.postMessage
    const created = await this.app.client.chat.postMessage(this.dropToSlackMessage(drop));
    if (created.ok) {
      drop.localId = created.ts;
      // const localKey = this.tub.getIndexKey({ model: 'message', localId: created.ts });
      // this.tub.setLocalId(localKey, tubsId);
      // console.log('writing back localId from Slack creation', drop);
      console.log('Stored on Slack as:', drop.localId);
      this.tub.addObject(drop);
    }
    // console.log(created);
  }
  async connect(port: number): Promise<void> {
    console.log('Connecting to Slack...');
    this.tub.on('create', this.createOnPlatform.bind(this));
    this.app.command('/tubs-connect', async ({ command, ack }) => {
      const uuid = command.user_id;
      const nonce = randomBytes(16).toString('hex');
      this.logins[nonce] = uuid;
      const loginURL = `${this.expressFullUrl}/slack/login?nonce=${nonce}`;
      await ack(loginURL);
    });

    this.app.command('/tubs-disconnect', async ({ command, ack }) => {
      const uuid = command.user_id;
      const nonce = randomBytes(16).toString('hex');
      this.logouts[nonce] = uuid;
      const logoutURL = `${this.expressFullUrl}/slack/logout?nonce=${nonce}`;
      await ack(logoutURL);
    });

    this.app.message(async ({ message }) => {
      this.emit('message', message);
    });
    await this.app.start(port);
    this.on('message', async (message: IMessage) => {
      // console.info('----------onMessage-----------');
      // const localId = this.tub.getIndexKey({ model: 'channel', localId: message.channel });
      // const tubsChannelId = await this.tub.getId(localId, equivalences[localId.join(':')], true);
      // const tubsMsgId = await this.tub.getId(this.tub.getIndexKey({ model: 'message', localId: message.ts }), undefined, true);
      const channelDrop: ChannelDrop = {
        localId: process.env.CHANNEL_IN_SLACK,
        foreignIds: {},
        model: 'channel',
      };
      const authorDrop: AuthorDrop = {
        localId: message.user,
        foreignIds: {},
        model: 'author',
      };
      const messageDrop: MessageDrop = this.slackMessageToDrop(message);
      
      console.log('Slack incoming:', messageDrop.text);
      this.tub.addObjects([channelDrop, authorDrop, messageDrop]);
    });
  }
}
