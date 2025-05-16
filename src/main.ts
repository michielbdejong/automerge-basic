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



// export function installLens(tubs: { [platform: string]: Tub}) {
//   message - message
//     uri - ts // lookup table between platform-supplied identifiers. In Solid the client has some freedom over choosing them, but there are rules attached regarding dereferencability,
//              // so when looking at Solid as a platform, we may include the publishing capabilities of the client as part of the platform, then it feels more like a regular API-based platform.
//     text - text // identity mapping
//     date - ts //  programmatic one-to-one conversion
//     user -[author.id || person.webId ]- authorWebId // lookup table between platform-supplied identifiers
//     channel - chatUri // lookup table between platform-supplied identifiers
//   author - person
//   channel - chat

//   where do I store those lookup tables? in foreignIds! But then I have a problem when I want to refer to a channel that needs to be created. So maybe use UUIDs after all?
//   or expose `channel: () => object` and use uuid's internally.

//   So really what I'm saying is it's the same as MessageDrop <> InternalDrop, except there is a SlackMessageBlob and a Solid MessageBlob
// }
// Slack
// this.tub.addTable({
//   name: 'message',
//   columns: [
//     { name: 'ts', type: 'string', isIndex: true },
//     { name: 'text', type: 'string' },
//     { name: 'user', type: 'string', isRelation: true, toTable: 'author' },
//     { name: 'channel', type: 'string', isRelation: true, toTable: 'channel' },
//   ],
//   canStoreMetadata: true,
// });
// this.tub.addTable({
//   name: 'author',
//   columns: [
//     { name: 'id', type: 'string', isIndex: true },
//   ],
//   canStoreMetadata: true,
// });
// this.tub.addTable({
//   name: 'channel',
//   columns: [
//     { name: 'id', type: 'string', isIndex: true },
//   ],
//   canStoreMetadata: true,
// });

// Solid
// this.tub.addTable({
//   name: 'message',
//   columns: [
//     { name: 'uri', type: 'string', isIndex: true },
//     { name: 'text', type: 'string' },
//     { name: 'date', type: 'date' },
//     { name: 'authorWebId', type: 'string', isRelation: true, toTable: 'person' },
//     { name: 'chatUri', type: 'string', isRelation: true, toTable: 'chat' },
//   ],
//   canStoreMetadata: true,
// });
// this.tub.addTable({
//   name: 'person',
//   columns: [
//     { name: 'webId', type: 'string', isIndex: true },
//   ],
//   canStoreMetadata: true,
// });
// this.tub.addTable({
//   name: 'chat',
//   columns: [
//     { name: 'uri', type: 'string', isIndex: true },
//   ],
//   canStoreMetadata: true,
// });