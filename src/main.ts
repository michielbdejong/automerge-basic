import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub } from './tub.js';
import { SlackClient } from './SlackClient.js';
import { SolidClient } from './SolidClient.js';


createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function run(): Promise<void> {
  const slackTub = new Tub('slack');
  const solidTub = new Tub('solid');
  const docUrl = await slackTub.createDoc();
  await solidTub.setDoc(docUrl);

  const slack = new SlackClient();
  const slackChannelId = slackTub.getIndexKey({ model: 'channel', localId: process.env.CHANNEL_IN_SLACK });

  const solid = new SolidClient();
  const solidChannelId = solidTub.getIndexKey({ model: 'channel', localId: process.env.CHANNEL_IN_SOLID });
  
  await slack.listen(slackTub, 8080, {
    [slackChannelId.join(':')]: solidChannelId
  });

  await solid.connect();
  await solid.listen(solidTub, {
    [solidChannelId.join(':')]: slackChannelId
  });
  // await solid.createChat('https://michielbdejong.solidcommunity.net/IndividualChats/bla', 'Bla Chat');
  // const read = await solid.readChat('https://michielbdejong.solidcommunity.net/IndividualChats/blactbd1Z/index.ttl#this');
  // console.log(read);
}

// ...
run();
