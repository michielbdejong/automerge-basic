import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub, createTubs } from './tub.js';
// import { getIndexKey } from './utils.js';
import { SlackClient } from './SlackClient.js';
import { SolidChatClient } from './SolidChatClient.js';

createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function runSolid(solidTub: Tub): Promise<void> {
  const solid = new SolidChatClient(solidTub);
  await solid.connect();
  await solid.listen();
  // await solid.createChat('https://michielbdejong.solidcommunity.net/IndividualChats/bla', 'Bla Chat');
  // const read = await solid.readChat('https://michielbdejong.solidcommunity.net/IndividualChats/blactbd1Z/index.ttl#this');
  // console.log(read);
}
async function runSlack(slackTub: Tub): Promise<void> {
  const slack = new SlackClient('', slackTub);
  await slack.connect(8080);
}

async function run(): Promise<void> {
  const [slackTub, solidTub] = await createTubs(['slack', 'solid'], {
    channel: [
      {
        solid: process.env.CHANNEL_IN_SOLID,
        slack: process.env.CHANNEL_IN_SLACK,
      },
    ],
    author: [
      {
        slack: 'U05TRV6UVPV',
        solid: 'https://michielbdejong.solidcommunity.net/profile/card#me',
      },
      {
        slack: 'U0816RHEE85',
        solid: 'https://michielbdejong.solidcommunity.net/profile/card#me',
      },
    ],
  });
  await Promise.all([runSolid(solidTub), runSlack(slackTub)]);
}

// ...
run();
