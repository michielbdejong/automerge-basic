import { IncomingHttpHeaders } from 'http';
import * as url  from 'url';

export type LedgerAbout = {
  format: string,
  rate: number,
  absolutePath: string[],
  validated_window: number,
};

export class Ledger {
  private about: LedgerAbout;
  private accounts: {
    [name: string]: object
  };
  private nodeName: string;
  constructor (about: LedgerAbout, nodeName: string) {
    this.about = about;
    this.accounts = {};
    this.nodeName = nodeName;
  }
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
  async handleAbout(): Promise<{
    resStatus: number,
    resStatusText: string,
    resHeaders: Headers,
    resBody: string
    }> {
    return {
      resStatus: 200,
      resStatusText: 'OK',
      resHeaders: new Headers({
        'Content-Type': 'application/json',
      }),
      resBody: JSON.stringify({
        data: {
          format: this.about.format,
          rate: this.about.rate,
          absolutePath: this.about.absolutePath,
          validated_window: this.about.validated_window,
          trades: 0,
          volume: 0,
          traders: 0,
          accounts: Object.keys(this.accounts).length,
        }
      }),
    }
  }
  addAccount(name: string): void {
    this.accounts[name] = {};
  }
  setTrunkward(name: string): void {
    this.accounts[name] = {};
  }
  addLeafward(name: string): void {
    this.accounts[name] = {};
  }

  async proxy(data: {
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
      const urlParts = url.parse(data.path, true);
      console.log(data.path, urlParts.query.node_path);
      if ((urlParts.query.node_path === undefined) || (urlParts.query.node_path === this.nodeName)) {
        return this.handleAbout();
      } else {
        return this.proxy(data);
      }
    } else {
      return {
        resStatus: 404,
        resStatusText: 'unknown API route',
        resHeaders: new Headers({}),
        resBody: ''
      }
    }
    return this.proxy(data);
  }
}