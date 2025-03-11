import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub } from './tub.js';

createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/transaction/relay') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {

        const data = JSON.parse(body);
        const headers = JSON.parse(JSON.stringify(req.headers));
        console.log(req.url, data, headers);
        const postRes = await fetch('http://trunk.cc-server/transaction/relay', {
          method: 'POST',
          headers: {
            'cc-node': 'branch',
            'last-hash': 'trunk',
            'cc-node-trace': 'twig>branch>',
            'content-type': 'application/json'
          },
          body
        });
        console.log(postRes.status, await postRes.text());
      } catch (e) {
        console.error(e);
      }
    });
  }
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

// /transaction/relay {
// "uuid":"27d4e339-c69d-4aa3-9c38-1eeb4f17bb3a",
// "state":"V",
// "workflow":"_C0",
// "entries":[
// {"payee":"trunk\/branch\/twig\/alice",
// "payer":"branch\/bob",
// "quant":72,
// "description":"test without confirmation",
// "metadata":{"foo":"bar"}},
// {"payee":"trunk\/branch\/twig\/admin",
// "payer":"branch\/bob",
// "quant":24,
// "description":"Payer fee of 1 to twig\/admin",
// "metadata":{}}]}

// /transaction/relay {
// "uuid":"d2cf94ca-9d2e-4951-9b6e-73824c40a83f",
// "state":"V",
// "workflow":"_C0CE-PE0CX-",
// "entries":[
// {"payee":"trunk\/branch\/twig\/alice",
// "payer":"branch\/bob",
// "quant":192,
// "description":"test near instant bill",
// "metadata":{"foo":"bar"}},
// {"payee":"trunk\/branch\/twig\/admin",
// "payer":"branch\/bob",
// "quant":24,
// "description":"Payer fee of 1 to twig\/admin",
// "metadata":{}}]}

// /transaction/relay {
// "uuid":"a068b3b3-b554-4465-a6d1-e8deef9a953e",
// "state":"V",
// "workflow":"|P-PC+CX+",
// "entries":[
// {"payee":"branch2\/bob",
// "payer":"trunk\/branch\/twig\/alice",
// "quant":72,
// "description":"test long distance for 3 from leaf",
// "metadata":{"foo":"bar"}},
// {"payee":"trunk\/branch\/twig\/admin",
// "payer":"branch2\/bob",
// "quant":24,
// "description":"Payee fee of 1 to twig\/admin",
// "metadata":{}}]}