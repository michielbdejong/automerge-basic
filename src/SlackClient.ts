import { App as BoltApp } from "@slack/bolt";
import { randomBytes } from "node:crypto";

const BOLT_PORT = 7000;
export interface IMessage {
  client_msg_id: string;
  type:          string;
  text:          string;
  user:          string;
  ts:            string;
  blocks:        Block[];
  team:          string;
  channel:       string;
  event_ts:      string;
  channel_type:  string;
}

export interface Block {
  type:     string;
  block_id: string;
  elements: object[];
}


export interface IUserInfo {
  ok:   boolean;
  user: User;
}

export interface User {
  id:                  string;
  team_id:             string;
  name:                string;
  deleted:             boolean;
  color:               string;
  real_name:           string;
  tz:                  string;
  tz_label:            string;
  tz_offset:           number;
  profile:             { [key: string]: string };
  is_admin:            boolean;
  is_owner:            boolean;
  is_primary_owner:    boolean;
  is_restricted:       boolean;
  is_ultra_restricted: boolean;
  is_bot:              boolean;
  updated:             number;
  is_app_user:         boolean;
  has_2fa:             boolean;
}

export class SlackClient {
  private boltApp: BoltApp;
  private logins: { [nonce: string]: string } = {};
  private logouts: { [nonce: string]: string } = {};
  constructor() {
    this.boltApp = new BoltApp({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_USER_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
      port: BOLT_PORT
    });
  }
  
  async create(EXPRESS_FULL_URL: string): Promise<void> {
    this.boltApp.command("/tubs-connect", async ({ command, ack }) => {
      const uuid = command.user_id;
      const nonce = randomBytes(16).toString('hex');
      this.logins[nonce] = uuid;
      const loginURL = `${EXPRESS_FULL_URL}/slack/login?nonce=${nonce}`
      await ack(loginURL)
    });
    
    
    this.boltApp.command("/tubs-disconnect", async ({ command, ack }) => {
      const uuid = command.user_id;
      const nonce = randomBytes(16).toString('hex');
      this.logouts[nonce] = uuid;
      const logoutURL = `${EXPRESS_FULL_URL}/slack/logout?nonce=${nonce}`
      await ack(logoutURL)
    });
    
    
    this.boltApp.message(async ({ message }) => {
      console.info("----------onMessage-----------");
      
      // Get workspace id
      const { team } = await this.boltApp.client.team.info()
      
      // Get members of this Slack conversation
      const { members } = await this.boltApp.client.conversations.members({ channel: message.channel });
      
      // Slack user ID of the message sender
      const slackUUID = (message as IMessage).user;
      
      // User's Slack profile info is used to look for their Solid webId
      const userInfo = await this.boltApp.client.users.info({ user: slackUUID })
      console.log(team, members, userInfo)
      
      
      try {
        // Create a copy of the message in the pods of all the members of the conversation who have a
        // Solid session with us.
      } catch (error: unknown) {
        console.error(error instanceof Error ? error.message : JSON.stringify(error));
      }
    });
  }
  async start(port: number): Promise<void> {
    await this.boltApp.start(port);
  }
}
