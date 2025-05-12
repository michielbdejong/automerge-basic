import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub, createTubs } from './tub.js';
// import { getIndexKey } from './utils.js';
import { SlackClient } from './SlackClient.js';
import { SolidClient } from './SolidClient.js';


createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function runSolid(solidTub: Tub): Promise<void> {
  const solid = new SolidClient(solidTub);
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
  const [ slackTub, solidTub ] = await createTubs(['slack', 'solid'], [
    {
      channel: {
        [process.env.CHANNEL_IN_SLACK]: {
          solid: process.env.CHANNEL_IN_SOLID 
        }
      }
    },
    {
      channel: {
        [process.env.CHANNEL_IN_SOLID]: {
          solid: process.env.CHANNEL_IN_SLACK
        }
      }
    },
  ]);
  await Promise.all([
    runSolid(solidTub),
    runSlack(slackTub),
  ]);
}

// ...
run();
