import { createServer, IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http';
// import { Tub } from './tub.js';

function  analyseTraffic(data: {
  upstreamUrl: string,
  port: number,
  path: string,
  method: string,
  reqBody: string,
  reqHeaders: IncomingHttpHeaders,
  resStatus: number,
  resStatusText: string,
  resHeaders: Headers,
  resBody: string
}): void {
  const {
    upstreamUrl,
    port,
    path,
    method,
    reqBody,
    reqHeaders,
    resStatus,
    resStatusText,
    resHeaders,
    resBody
  } = data;
  console.log('REQ', `${upstreamUrl}:${port}${path}`, method, JSON.stringify(reqBody), reqHeaders);
  console.log('RES', resStatus, resStatusText, resBody, resHeaders);
  console.log('-------------------');
}

async function toBackend(data: {
  upstreamUrl: string,
  path: string,
  method: string,
  reqBody: string,
  reqHeaders: IncomingHttpHeaders
}): Promise<{
  resStatus: number,
  resStatusText: string,
  resHeaders: Headers,
  resBody: string
}> {
  const params = {
    method: data.method,
    headers: JSON.parse(JSON.stringify(data.reqHeaders))
  };
  if (data.reqBody.length > 0) {
    (params as unknown as { body: string }).body = data.reqBody;
  }
  const upstreamRes = await fetch(`${data.upstreamUrl}${data.path}`, params);
  const resBody = await upstreamRes.text();
  return {
    resStatus: upstreamRes.status,
    resStatusText: upstreamRes.statusText,
    resHeaders: upstreamRes.headers,
    resBody
  }
}

function startProxy(port: number, upstreamUrl: string, handler: typeof toBackend): void {
  createServer((req: IncomingMessage, res: ServerResponse) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const {
          resStatus,
          resStatusText,
          resHeaders,
          resBody
        } = await handler({
          upstreamUrl,
          path: req.url,
          method: req.method,
          reqBody: body,
          reqHeaders: req.headers
        });
        
        res.setHeaders(resHeaders);
        analyseTraffic({
          upstreamUrl,
          port,
          path: req.url,
          method: req.method,
          reqBody: body,
          reqHeaders: req.headers,
          resStatus,
          resStatusText,
          resHeaders,
          resBody
        });
        res.writeHead(resStatus, resStatusText);
        res.end(resBody);
      } catch (e) {
        console.error(e);
      }
    });
  }).listen(port);
  console.log(`Proxying ${upstreamUrl}:${port} in front of ${upstreamUrl}`);
}
  
async function run(): Promise<void> {
  // const tub1 = new Tub('1');
  // const tub2 = new Tub('2');
  // const docUrl = tub1.createDoc();
  // tub1.setText();
  // await tub2.setDoc(docUrl);
  // tub2.addText();
  startProxy(8060, 'http://twig.cc-server', toBackend);
  startProxy(8070, 'http://branch.cc-server', toBackend);
  startProxy(8080, 'http://trunk.cc-server', toBackend);
  startProxy(8090, 'http://branch2.cc-server', toBackend);
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