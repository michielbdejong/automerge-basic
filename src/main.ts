import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
// import { Tub } from './tub.js';
// import { SlackClient } from './SlackClient.js';
import { SolidClient } from './SolidClient.js';


createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function run(): Promise<void> {
  // const tub1 = new Tub('1');
  // const tub2 = new Tub('2');
  // const docUrl = await tub1.createDoc();
  // await tub1.createDoc();
  // await tub2.setDoc(docUrl);

  // const slack = new SlackClient();
  // await slack.listen(tub1, 8080);

  const solid = new SolidClient();
  await solid.connect();
  // await solid.listen(tub2);
  // await solid.createChat('https://michielbdejong.solidcommunity.net/IndividualChats/bla', 'Bla Chat');
  const read = await solid.readChat('https://michielbdejong.solidcommunity.net/IndividualChats/blactbd1Z/index.ttl#this');
  console.log(read);
}

// ...
run();
