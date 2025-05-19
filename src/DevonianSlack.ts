import { DevonianClient, DevonianIndex, ForeignIds } from 'devonian';

export type SlackMetadata = {
  event_type: 'devonian',
  event_payload: {
    foreignIds: ForeignIds
  },
}

export type SlackMessage = {
  ts?: string,
  user?: string,
  channel: string,
  text: string,
  foreignIds: ForeignIds,
};

export function slackMetadataToForeignIds(metadata:  {
  event_type: string;
  event_payload: {
    foreignIds?: object;
  };
} | undefined): object {
  if (metadata?.event_payload?.foreignIds) {
    return metadata.event_payload.foreignIds;
  }
  return {};
}

export function foreignIdsToSlackMetadata(foreignIds: ForeignIds): SlackMetadata {
  return {
    event_type: 'devonian',
    event_payload: {
      foreignIds,
    },
  };
}

export class SlackMessageClient extends DevonianClient<SlackMessage> {
  index: DevonianIndex;
  constructor(index: DevonianIndex) {
    super();
    this.index = index;
    this.on('add', (obj: SlackMessage) => {
      console.log('incoming slack message');
      this.storeIdentitiesFromSlack(obj);
    });
  }

  storeIdentitiesFromSlack(input: SlackMessage): void {
    // if (typeof input.metadata === 'object' && input.metadata.event_type === 'devonian') {
    //   const foreignIds = input.metadata.event_payload.foreignIds || {};
      this.index.storeIdentitiesFrom('message', 'slack', input.ts, input.foreignIds);
    // }
  }

  async add(obj: SlackMessage): Promise<string> {
    this.storeIdentitiesFromSlack(obj);
    return 'ts';
  }
}
    
