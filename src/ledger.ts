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
    [name: string]: { type: string }
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
  async handleAccountsPlural(): Promise<{
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
        data: Object.keys(this.accounts).filter((name: string) => {
          return (this.accounts[name].type === 'local');
        }).map((name: string) => {
           return this.about.absolutePath.join('/').concat(name);
        }),
      }),
    };
  }
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
  async handleTransaction(data: {
    path: string,
  }): Promise<{
    resStatus: number,
    resStatusText: string,
    resHeaders: Headers,
    resBody: string
    }> {
    let resData: object;
    const pathParts = data.path.split('/');
    if (pathParts.length === 2) {
      if (pathParts[1] === 'relay') {
        resData = {};
      }
    } else if (pathParts.length === 3) {
      if (pathParts[2] === 'P') {
        resData = {};
      }
      if (pathParts[2] === 'C') {
        resData = {};
      }
    }
    return {
      resStatus: 200,
      resStatusText: 'OK',
      resHeaders: new Headers({
        'Content-Type': 'application/json',
      }),
      resBody: JSON.stringify(resData),
    };
  }
  addAccount(name: string): void {
    this.accounts[name] = { type: 'local' };
  }
  setTrunkward(name: string): void {
    this.accounts[name] = { type: 'trunkward' };
  }
  addLeafward(name: string): void {
    this.accounts[name] = { type: 'leafward' };
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
      return this.handleAccountsPlural();
    } else if (data.path.startsWith('/account')) {
      const urlParts = url.parse(data.path, true);
      const accPath = (urlParts.query.acc_path as string).split('/');
      if (accPath.length === 1 || accPath[0] === this.nodeName) {
        // return this.handleAccountSingle(accPath[accPath.length - 1]);
      } else {
        return this.proxy(data);
      }
      // return this.handleAccountSingle(data);
    } else if (data.path.startsWith('/entries')) {
      // return this.handleEntries(data);
    } else if (data.path.startsWith('/transactions')) {
      // return this.handleTransactionsPlural(data);
    } else if (data.path.startsWith('/transaction')) {
      // return this.handleTransactionSingle(data);
    } else if (data.path.startsWith('/about')) {
      const urlParts = url.parse(data.path, true);
      // console.log(data.path, urlParts.query.node_path);
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