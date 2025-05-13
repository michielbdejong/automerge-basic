# Work in Progress

## Description
The TUBS Reflector is a new piece of software for data portability that is going to be insanely great.
So far it only syncs messages between a Slack channel and a Solid chat, but it does so in an interesting way:

First, the Slack message will come out of the Slack API in the following form:
```javascript
{
    ts: '1234.567',
    text: 'Hello', 
    user: 'U0816RHEE85',
    channel: 'C08RHPHV05D',
    metadata: {
      event_type: 'from_tubs',
      event_payload: {
        foreignIds: {
          tubs: '8f836179-d309-40c9-b184-caaaf343cfc5',
          solid: 'https://michielbdejong.solidcommunity.net/IndividualChats/nlnet-demo/2025/05/13/chat.ttl#7hVnQ4',
        },
      },
    },
  }
```

A [Cambria](https://github.com/inkandswitch/cambria-project) lens is used to convert this to a Tubs `MessageDrop` for the Slack platform:
```javascript
{
  localId: '1234.567',
  authorId: 'U0816RHEE85',
  channelId: 'C08RHPHV05D',
  text: 'Hello',
  date: new Date('2025-05-13T08:40:52Z'),
  foreignIds: {
    tubs: '8f836179-d309-40c9-b184-caaaf343cfc5',
    solid: 'https://michielbdejong.solidcommunity.net/IndividualChats/nlnet-demo/2025/05/13/chat.ttl#7hVnQ4',
  },
  model: 'message'
}
```

The `localId`, `authorId`, and `channelId` fields are scoped to the Slack platform, and the `foreignIds` dictionary can be used to locate corresponding identifiers on other platforms, with the `tubs` identifier being a UUID.

TUBS knows that fields ending in `Id` refer to other objects. So far relations are named to the model they refer to. So an object of schema `message` can only refer to an object of type `channel` as "the channelId of the message".

In future versions of TUBS it will also be possible to have named relations (such as 'parent') whose model is for instance of the same schema.

In the next step, TUBS distinguishes between properties such as `text` and relations such as `authorId` (based on the `-Id` field key suffix), looks up the identifiers for these relations, and converts from this platform-specific format to a generic one:
```javascript
{
  tubsId: '8f836179-d309-40c9-b184-caaaf343cfc5',
  platformIds: {
    slack: '1234.567',
    solid: 'https://michielbdejong.solidcommunity.net/IndividualChats/nlnet-demo/2025/05/13/chat.ttl#7hVnQ4',
  },
  model: 'message',
  properties: {
    text: 'Hello',
    date: new Date('2025-05-13T08:40:52Z'),
  },
  relations: {
    author: '83e73470-e8c7-4bb3-9fac-aa04d5ed5a82',
    channel: 'd0594530-c7b3-445b-922d-da6730c292f6',
  }
}
```

This data, along with a search index mapping from platform ID's to Tubs ID's, is stored in an [automerge](https://automerge.org) replica. There is one automerge replica per platform, and automerge takes care of syncing the data from one platform to all the others, in this case from Slack to Solid.

There, the model is converted to a `MessageDrop` object again, but this time the local identifiers are the Solid-specific ones. Note that `localId` is undefined, to indicate that this object has not been created on Solid yet. The Solid-specific values for authorId and channelId are determined from a mapping that is part of the reflector config:

```javascript
{
  localId: undefined,
  authorId: 'https://michielbdejong.solidcommunity.net/profile/card#me',
  channelId: 'https://michielbdejong.solidcommunity.net/IndividualChats/nlnet-demo/index.ttl#this',
  text: 'Hello',
  date: new Date('2025-05-13T08:40:52Z'),
  foreignIds: {
    tubs: '8f836179-d309-40c9-b184-caaaf343cfc5',
    slack: '1234.567',
  },
  model: 'message'
}
```

## Try to run it

Configure the following values in `.env`:
```
BOLT_PORT=7000
EXPRESS_PORT=8000
EXPRESS_HOST=http://localhost:8000
SERVER_BASE_URL=http://localhost:8000
SLACK_SIGNING_SECRET=...
SLACK_BOT_USER_TOKEN=...
SLACK_APP_TOKEN=...
SLACK_DOMAIN=https://testworkspace-ilu2465.slack.com/
COOKIE_SIGNING_SECRET=...
SOLID_SERVER=https://solidcommunity.net
SOLID_EMAIL=michielbdejong@users.css.pod
SOLID_PASSWORD=...
CHANNEL_IN_SOLID="https://michielbdejong.solidcommunity.net/IndividualChats/michielbdejong.inrupt.net/index.ttl#this"
CHANNEL_IN_SLACK=C081DAJES6Q
```

In Slack, right click on the channel you wish to integrate with. A menu will appear.
In this menu, select "View channel details," and the relevant window will appear.
In this window, select Integrations.
Here you can click on the "Add an App" button to view the Apps that have been approved for this channel and you should be able to add Solid Slack Bridge from here.

 ```
npm install
npm test
npm run build
npm start
 ```
