import { DevonianClient, DevonianIndex, ForeignIds } from 'devonian';


export function solidSameasToForeignIds(sameAs: string[]): ForeignIds {
  const ret: { [platform: string]: string } = {};
  sameAs.forEach((uri: string) => {
    if (uri.startsWith(`https://tubsproject.org/id/message/`)) {
      const rest = (uri.substring(`https://tubsproject.org/id/message/`.length));
      const parts = rest.split('/');
      if (parts.length === 2) {
        ret[parts[0]] = parts[1]
      }
    }
  });
  return ret;
}

export function foreignIdsToSolidSameas(foreignIds: object): string[] {
  return Object.keys(foreignIds).map(otherPlatform => {
    return `https://tubsproject.org/id/message/${otherPlatform}/${foreignIds[otherPlatform]}`;
  });
}


export type SolidMessage = {
  uri?: string,
  chatUri: string,
  text: string,
  authorWebId: string,
  date?: Date,
  foreignIds: ForeignIds,
};

export class SolidMessageClient extends DevonianClient<SolidMessage> {
  private index: DevonianIndex;
  constructor(index: DevonianIndex) {
    super();
    this.index = index;
  }
  async connect(): Promise<void> {

  }

  async add(obj: SolidMessage): Promise<string> {
    console.log('make an API call', obj, typeof this.index);
    return 'uri';
  }
}