export type IdentityMap = {
  [platform: string]: string,
};

export type InternalDrop = {
  tubsId: string,
  platformIds: IdentityMap // identifiers on any platforms, not tubs
    
  model: string,
  properties: {
    [key: string]: string | number | Date | boolean
  },
  relations: {
    [relationship: string]: { model: string, tubsId: string },
  },
};

export type LocalizedDrop = {
  localId: string | undefined,
  foreignIds: IdentityMap // identifiers on any platforms, including tubs, but not the local one
  model: string,
};

export function localizedDropToInternal(fromPlatform: string, from: LocalizedDrop, identifierToInternal: (model: string, localId: string) => string): InternalDrop {
  const ret: InternalDrop = {
    tubsId: from.foreignIds.tubs || identifierToInternal(from.model, from.localId),
    platformIds: {},
    properties: {},
    relations: {},
    model: from.model,
  };
  Object.keys(from).forEach(field => {
    if (field === 'localId') {
      ret.platformIds[fromPlatform] = from[field];
    } else if (field === 'foreignIds') {
      Object.keys(from[field]).forEach(platform => {
        if (platform !== 'tubs') {
          ret.platformIds[platform] = from[field][platform];
        }
      });
    } else if (field.endsWith('Id')) {
      const relation = field.substring(0, field.length - 'Id'.length);
      ret.relations[relation] = { model: relation, tubsId: identifierToInternal(relation, from[field]) };
    } else {
      ret.properties[field] = from[field];
    }
  });
  return ret;
}

export function internalDropToLocalized(toPlatform: string, from: InternalDrop, identifierToLocal: (model: string, tubsId: string) => string): LocalizedDrop {
  // console.log('localizing drop', from);
  const ret: LocalizedDrop = {
    localId: from.platformIds[toPlatform] || identifierToLocal(from.model, from.tubsId),
    foreignIds: from.platformIds,
    model: from.model,
  };
  delete ret.foreignIds[toPlatform];
  ret.foreignIds.tubs = from.tubsId;
  Object.keys(from.properties).forEach(field => {
    ret[field] = from.properties[field];
  });
  Object.keys(from.relations).forEach(relation => {
    ret[`${relation}Id`] = identifierToLocal(relation, from.relations[relation].tubsId);
  });
  return ret;
}

export type MessageDrop = LocalizedDrop & {
  text: string,
  channelId: string,
  authorId: string,
  date: Date,
};

export type ChannelDrop = LocalizedDrop & {
};

export type AuthorDrop = LocalizedDrop & {
};
