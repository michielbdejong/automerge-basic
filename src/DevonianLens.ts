import { EventEmitter } from 'node:events';

export class DevonianTable<Model> extends EventEmitter {
  rows: Model[] = [];
  async add(obj: Model): Promise<void> {
    this.rows.push(obj);
    this.emit('add', obj);
  }
};

export class DevonianLens<LeftModel, RightModel> {
  left: DevonianTable<LeftModel>;
  right: DevonianTable<RightModel>;
  constructor(left: DevonianTable<any>, right: DevonianTable<any>, leftToRight: (input: LeftModel) => RightModel, rightToLeft: (input: RightModel) => LeftModel) {
    this.left = left;
    this.right = right;
    left.on('add', (added: LeftModel) => {
      right.add(leftToRight(added));
    });
    right.on('add', (added: RightModel) => {
      left.add(rightToLeft(added));
    });
  }
}

export type SolidMessage = {
  uri?: string,
  chatUri: string,
  text: string,
  authorWebId: string,
  date?: Date,
  sameAs: string[],
};
export type SlackMessage = {
  ts?: string,
  user?: string,
  channel: string,
  text: string,
  metadata?: {
    event_type: string;
    event_payload: {
      foreignIds?:  { [platform: string]: string };
    };
  };
};

const solidMessageTable = new DevonianTable<SolidMessage>();
const slackMessageTable = new DevonianTable<SlackMessage>();
const ids: {
  [model: string]: {
    [platform: string]: string
  }[]
} = {};
const index: {
  [model: string]: {
    [platform: string]: {
      [localId: string]: number;
    };
  };
} = {};

function lookupIndexFrom(model: string, platform: string, localId: string, foreignIds: { [platform: string]: string}): number | undefined {
  if (typeof index[model]?.[platform]?.[localId] === 'number') {
    return index[model]![platform]![localId];
  }
  for (let i = 0; i < Object.keys(foreignIds).length; i++) {
    const otherPlatform = Object.keys(foreignIds)[i];
    if (typeof index[model]?.[otherPlatform]?.[foreignIds[otherPlatform]] === 'number') {
      return index[model]![otherPlatform]![foreignIds[otherPlatform]];
    }
  }
  return undefined;
}

function storeIdentitiesFrom(model: string, platform: string, localId: string, foreignIds: { [platform: string]: string}) {
  const i = lookupIndexFrom(model, platform, localId, foreignIds);
  if (typeof i === 'number') {
    ids[model][i][platform] = localId;
    index[model]![platform]![localId] = i;
    Object.keys(foreignIds).forEach(otherPlatform => {
      ids[model][i][otherPlatform] = foreignIds[otherPlatform];
      index[model]![otherPlatform]![foreignIds[otherPlatform]] = i;
    });
  }
}

function storeIdentitiesFromSlack(input: SlackMessage) {
  if (typeof input.metadata === 'object' && input.metadata.event_type === 'devonian') {
    const foreignIds = input.metadata.event_payload.foreignIds || {};
    storeIdentitiesFrom('message', 'slack', input.ts, foreignIds);
  }
}

function storeIdentitiesFromSolid(input: SolidMessage) {
  const foreignIds = solidSameasToForeignIds(input.sameAs);
  storeIdentitiesFrom('message', 'solid', input.uri, foreignIds);
}

function convert(model: string, fromPlatform: string, fromLocalId: string, toPlatform: string): string | undefined {
  const i: number | undefined = index[model]?.[fromPlatform]?.[fromLocalId];
  if (i) {
    return ids[model][i][toPlatform];
  }
  return undefined;
}

function slackMetadataToSolidSameas(metadata:  {
  event_type: string;
  event_payload: {
    foreignIds?: object;
  };
} | undefined): string[] {
  if (metadata) {
    return Object.keys(metadata.event_payload.foreignIds).map(otherPlatform => {
      return `https://tubsproject.org/id/message/${otherPlatform}/${metadata.event_payload.foreignIds[otherPlatform]}`;
    });
  }
  return [];
}

function solidSameasToForeignIds(sameAs: string[]): { [platform: string]: string } {
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

new DevonianLens<SlackMessage, SolidMessage>(
  solidMessageTable,
  slackMessageTable,
  (input: SlackMessage): SolidMessage => {
    storeIdentitiesFromSlack(input);
    return {
      uri: convert('message', 'slack', input.ts, 'solid'),
      chatUri: convert('channel', 'slack', input.channel, 'solid'),
      text: input.text,
      authorWebId: convert('person', 'slack', input.user, 'solid'),
      date: new Date(parseFloat(input.ts) * 1000),
      sameAs: slackMetadataToSolidSameas(input.metadata),
    };
  },
  (input: SolidMessage): SlackMessage => {
    storeIdentitiesFromSolid(input);
    return {
      ts: convert('message', 'solid', input.uri, 'slack'),
      user: convert('person', 'solid', input.authorWebId, 'slack'),
      text: input.text,
      channel: convert('channel', 'solid', input.chatUri, 'slack'),
      metadata: {
        event_type: 'devonian',
        event_payload: {
          foreignIds: solidSameasToForeignIds(input.sameAs),
        },
      },
    };
  },
);
