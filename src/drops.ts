export type DropInternal = {
  id: string,
  identifiers: {
    [platform: string]: string,
  },
  properties: {
    [key: string]: any,
  },
  relations: {
    [relationship: string]: { model: string, id: string },
  },
};

export type MessageDrop = {
  id: string | undefined,
  text: string,
  channelId: string,
  authorId: string,
  date: Date,
  foreignIds: {
    [platform: string]: string,
  }
};