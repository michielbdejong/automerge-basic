import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub } from './tub.js';

createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function run(): Promise<void> {
  const tub1 = new Tub('1');
  const tub2 = new Tub('2');
  const docUrl = tub1.createDoc();
  tub1.setText();
  await tub2.setDoc(docUrl);
  tub2.addText();
}

// ...
run();