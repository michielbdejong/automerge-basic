import 'dotenv/config';
import { DevonianIndex } from 'devonian';
import { SolidMessageClient } from './SolidMessageClient.js';
import { SlackMessageClient } from './SlackMessageClient.js';
import { DevonianSolidSlackBridge } from './DevonianSolidSlackBridge.js';

// ...
const index = new DevonianIndex();
index.storeEquivalences({
    channel: [
      {
        solid: process.env.CHANNEL_IN_SOLID,
        slack: process.env.CHANNEL_IN_SLACK,
      },
    ],
    author: [
      {
        solid: process.env.USER_IN_SOLID,
        slack: process.env.USER_IN_SLACK,
      },
    ],
});
const solidMessageClient = new SolidMessageClient();
const slackMessageClient = new SlackMessageClient(index);
new DevonianSolidSlackBridge(index, solidMessageClient, slackMessageClient );
await Promise.all([
  slackMessageClient.connect(),
  solidMessageClient.connect(),
]);
