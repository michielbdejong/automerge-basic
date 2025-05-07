import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub, idSpecToStr } from './tub.js';
import { SlackClient } from './SlackClient.js';
import { SolidClient } from './SolidClient.js';


createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function run(): Promise<void> {
  const tub1 = new Tub('1');
  const tub2 = new Tub('2');
  const docUrl = await tub1.createDoc();
  await tub2.setDoc(docUrl);

  const slack = new SlackClient();
  const slackChannelId = slack.makeChannelId(process.env.CHANNEL_IN_SLACK);

  const solid = new SolidClient();
  const solidChannelId = solid.makeChannelId(process.env.CHANNEL_IN_SOLID);
  
  await slack.listen(tub1, 8080, {
    [idSpecToStr(slackChannelId)]: solidChannelId
  });

  await solid.connect();
  await solid.listen(tub2, {
    [idSpecToStr(solidChannelId)]: slackChannelId
  });
  // await solid.createChat('https://michielbdejong.solidcommunity.net/IndividualChats/bla', 'Bla Chat');
  // const read = await solid.readChat('https://michielbdejong.solidcommunity.net/IndividualChats/blactbd1Z/index.ttl#this');
  // console.log(read);
}

// ...
run();
