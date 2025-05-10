import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub } from './tub.js';
import { getIndexKey } from './utils.js';
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

async function createTubs(names: string[]): Promise<Tub[]> {
  if (names.length === 0) {
    return [];
  }
  // FIXME: generalize this
  const channelIds = [
    getIndexKey({ platform: names[0], model: 'channel', localId: process.env.CHANNEL_IN_SLACK }),
   getIndexKey({ platform: names[1], model: 'channel', localId: process.env.CHANNEL_IN_SOLID }),
  ];

  const tubs = [
    new Tub(names[0], { [channelIds[0].join(':')]: channelIds[1] }),
  ];
  const docUrl = await tubs[0].createDoc();

  for (let i=1; i < names.length; i++) {
    tubs[i] = new Tub(names[i], { [channelIds[i].join(':')]: channelIds[0] });
    await tubs[i].setDoc(docUrl);
  }
  return tubs;
}

async function run(): Promise<void> {
  const [ slackTub, solidTub ] = await createTubs(['slack', 'solid']);
  await Promise.all([
    runSolid(solidTub),
    runSlack(slackTub),
  ]);
}

// ...
run();
