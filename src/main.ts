import 'dotenv/config';
import { DevonianIndex } from 'devonian';
import { SolidClient } from './SolidClient.js';
import { SolidMessageClient } from './SolidMessageClient.js';
import { SolidIssueClient } from './SolidIssueClient.js';
import { SlackMessageClient } from './SlackMessageClient.js';
import { GithubIssueClient } from './GithubIssueClient.js';
import { DevonianSolidSlackBridge } from './DevonianSolidSlackBridge.js';
import { DevonianSolidGithubBridge } from './DevonianSolidGithubBridge.js';

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
const solidClient = new SolidClient();
const clients = {
 solidMessage: new SolidMessageClient(solidClient),
 solidIssue: new SolidIssueClient(solidClient),
 slackMessage: new SlackMessageClient(),
 githubIssue: new GithubIssueClient(),
};
new DevonianSolidSlackBridge(index, clients.solidMessage, clients.slackMessage);
new DevonianSolidGithubBridge(index, clients.solidIssue, clients.githubIssue);
await Promise.all(Object.keys(clients).map(name => clients[name].connect()));
