import 'dotenv/config';
import { DevonianIndex } from 'devonian';
import { SolidMessageClient } from './DevonianSolid.js';
import { SlackMessageClient } from './DevonianSlack.js';
import { DevonianSolidSlackBridge } from './DevonianSolidSlackBridge.js';

// ...
const index = new DevonianIndex();
const solidMessageClient = new SolidMessageClient(index);
const slackMessageClient = new SlackMessageClient(index);
new DevonianSolidSlackBridge(index, solidMessageClient, slackMessageClient );
