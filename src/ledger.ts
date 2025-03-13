import { IncomingHttpHeaders } from 'http';

export class Ledger {
  async handleForms(): Promise<{
    resStatus: number,
    resStatusText: string,
    resHeaders: Headers,
    resBody: string
    }> {
    return {
      resStatus: 500,
      resStatusText: 'Not implemented yet',
      resHeaders: new Headers({}),
      resBody: ''
    }
  }
  // async handleAccountsPlural(data: {
  //   path: string,
  //   reqHeaders: IncomingHttpHeaders
  // }): Promise<{
  //   resStatus: number,
  //   resStatusText: string,
  //   resHeaders: Headers,
  //   resBody: string
  //   }> {
  //   return {
  //     resStatus: 500,
  //     resStatusText: 'Not implemented yet',
  //     resHeaders: new Headers({}),
  //     resBody: ''
  //   }
  // }
  async handle(data: {
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
    if (data.path.startsWith('/forms')) {
      return this.handleForms();
    } else if (data.path.startsWith('/accounts')) {
      // return this.handleAccountsPlural(data);
    } else if (data.path.startsWith('/account')) {
      // return this.handleAccountSingle(data);
    } else if (data.path.startsWith('/entries')) {
      // return this.handleEntries(data);
    } else if (data.path.startsWith('/transactions')) {
      // return this.handleTransactionsPlural(data);
    } else if (data.path.startsWith('/transaction')) {
      // return this.handleTransactionSingle(data);
    } else if (data.path.startsWith('/about')) {
      // return this.handleAbout(data);
    } else {
      return {
        resStatus: 404,
        resStatusText: 'unknown API route',
        resHeaders: new Headers({}),
        resBody: ''
      }
    }
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
}