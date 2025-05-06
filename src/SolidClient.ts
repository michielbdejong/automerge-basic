import { v7 } from "css-authn";

export class SolidClient {
  fetch: typeof globalThis.fetch;
  async connect(): Promise<void> {
    this.fetch = await v7.getAuthenticatedFetch({
      email: process.env.SOLID_EMAIL,
      password: process.env.SOLID_PASSWORD,
      provider: process.env.SOLID_SERVER,
    });
  };
}
