import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub } from './tub.js';
import { SlackClient } from './SlackClient.js';

createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function run(): Promise<void> {
  await startSlackClient();
  const tub1 = new Tub('1');
  const tub2 = new Tub('2');
  const docUrl = tub1.createDoc();
  tub1.setText();
  await tub2.setDoc(docUrl);
  tub2.addText();
}
async function startSlackClient(): Promise<void> {
  const slackClient = new SlackClient();
  await slackClient.create('');
  await slackClient.start(8080);
}

// ...
run();
