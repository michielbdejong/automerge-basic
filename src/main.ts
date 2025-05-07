import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub } from './tub.js';
import { startSlackClient } from './SlackClient.js';
import { startSolidClient } from './SolidClient.js';


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
  await startSlackClient(tub1);
  await tub2.setDoc(docUrl);
  const solid = await startSolidClient(tub2);
  await solid.createChat('https://michielbdejong.solidcommunity.net/IndividualChats/bla', 'Bla Chat');
}

// ...
run();
