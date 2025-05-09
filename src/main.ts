import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub, Equivalences } from './tub.js';
import { SlackClient } from './SlackClient.js';
import { SolidClient } from './SolidClient.js';


createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function runSolid(solidTub: Tub, equivalences: Equivalences): Promise<void> {
  const solid = new SolidClient(solidTub);
  await solid.connect();
  await solid.listen(equivalences);
  // await solid.createChat('https://michielbdejong.solidcommunity.net/IndividualChats/bla', 'Bla Chat');
  // const read = await solid.readChat('https://michielbdejong.solidcommunity.net/IndividualChats/blactbd1Z/index.ttl#this');
  // console.log(read);

}
async function runSlack(slackTub: Tub, equivalences: Equivalences): Promise<void> {
  const slack = new SlackClient('', slackTub);
  await slack.connect(8080, equivalences);
}

async function createTubs(names: string[]): Promise<Tub[]> {
  if (names.length === 0) {
    return [];
  }
  const tubs = [
    new Tub(names[0]),
  ];
  const docUrl = await tubs[0].createDoc();
  
  for (let i=1; i < names.length; i++) {
    tubs[i] = new Tub(names[i]);
    await tubs[i].setDoc(docUrl);
  }
  return tubs;
}

async function run(): Promise<void> {
  const [ slackTub, solidTub ] = await createTubs(['slack', 'solid']);
  const slackChannelId = slackTub.getIndexKey({ model: 'channel', localId: process.env.CHANNEL_IN_SLACK });
  const solidChannelId = solidTub.getIndexKey({ model: 'channel', localId: process.env.CHANNEL_IN_SOLID });
  await Promise.all([
    runSolid(solidTub, {
      [solidChannelId.join(':')]: slackChannelId
    }),
    runSlack(slackTub, {
      [slackChannelId.join(':')]: solidChannelId
    }),
  ]);
}

// ...
run();
