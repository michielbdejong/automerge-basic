import { createServer, IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http';
import { Ledger } from './ledger.js';

function  analyseTraffic(data: {
  upstreamUrl: string,
  backendUrl: string,
  port: number,
  path: string,
  method: string,
  reqBody: string,
  reqHeaders: IncomingHttpHeaders,
  resStatus: number,
  resStatusText: string,
  resHeaders: { [key: string]: string },
  resBody: string
}): void {
  const {
    upstreamUrl,
    backendUrl,
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
  console.log('REQ', `[${upstreamUrl}:${port}>${backendUrl}]${path}`, method, JSON.stringify(reqBody), reqHeaders);
  console.log('RES', resStatus, resStatusText, resBody, resHeaders);
  console.log('-------------------');
}

async function toBackend(data: {
  backendUrl: string,
  path: string,
  method: string,
  reqBody: string,
  reqHeaders: IncomingHttpHeaders
}): Promise<{
  resStatus: number,
  resStatusText: string,
  resHeaders: { [key: string]: string },
  resBody: string
}> {
  const params = {
    method: data.method,
    headers: JSON.parse(JSON.stringify(data.reqHeaders))
  };
  if (data.reqBody.length > 0) {
    (params as unknown as { body: string }).body = data.reqBody;
  }
  const upstreamRes = await fetch(`${data.backendUrl}${data.path}`, params);
  const resBody = await upstreamRes.text();
  const resHeaders: { [key: string]: string } = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const header of upstreamRes.headers as unknown as any) {
    resHeaders[header[0]] = header[1];
  }

  return {
    resStatus: upstreamRes.status,
    resStatusText: upstreamRes.statusText,
    resHeaders,
    resBody
  }
}

function startProxy(port: number, upstreamUrl: string, handler: typeof toBackend, backendUrl?: string): void {
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
          backendUrl: (backendUrl ? backendUrl : upstreamUrl),
          path: req.url,
          method: req.method,
          reqBody: body,
          reqHeaders: req.headers
        });
        Object.keys(resHeaders).forEach(key => {
          res.setHeader(key, resHeaders[key]);
        });
        analyseTraffic({
          upstreamUrl,
          backendUrl: (backendUrl ? backendUrl : upstreamUrl),
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
  console.log(`Proxying ${upstreamUrl}:${port} in front of ${backendUrl}`);
}
  
async function run(): Promise<void> {
  const ledger = new Ledger({
    format: "0",
    "rate":1,
    "absolutePath": ["trunk","branch"],
    "validated_window":300,
  }, 'branch');
  ledger.addAccount('admin');
  ledger.addAccount('alice');
  ledger.addAccount('bob');
  ledger.setTrunkward('trunk');
  ledger.addLeafward('twig');

  startProxy(8060, 'http://twig.cc-server', toBackend);
  // startProxy(8070, 'http://branch.cc-server', ledger.handle.bind(ledger));
  startProxy(8070, 'http://branch.cc-server', toBackend);
  startProxy(8080, 'http://trunk.cc-server', toBackend);
  startProxy(8090, 'http://branch2.cc-server', toBackend, 'http://komunitin-accounting-1:2025/NET2/cc');
  // startProxy(8090, 'http://branch2.cc-server', toBackend);
}

// ...
run();
