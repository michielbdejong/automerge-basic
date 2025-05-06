import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
// import { Tub } from './tub.js';
// import { SlackClient, IMessage } from './SlackClient.js';
import { SolidClient } from './SolidClient.js';


createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function run(): Promise<void> {
  // const tub1 = new Tub('1');
  // const tub2 = new Tub('2');
  // const docUrl = await tub1.createDoc();
  // await startSlackClient(tub1);
  // await tub2.setDoc(docUrl);
  const solid = new SolidClient();
  await solid.connect();
  const topic = process.env.SOLID_TOPIC;
  const streamingUrl = `https://solidcommunity.net/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(topic)}`;
  const res = await solid.fetch(streamingUrl);
  const textStream = res.body.pipeThrough(new TextDecoderStream());
  for await (const notificationText of textStream as unknown as {
    [Symbol.asyncIterator](): AsyncIterableIterator<string>;
  }) {
    console.log(notificationText);
    const docRes = await solid.fetch(topic, {
      headers: {
        Accept: 'application/ld+json',
      },
    });
    const chatChannel = await docRes.json();
    chatChannel.forEach(entry => {
      if (entry['@id'].startsWith(topic)) {
        if (Array.isArray(entry['http://rdfs.org/sioc/ns#content']) && entry['http://rdfs.org/sioc/ns#content'].length === 1) {
          console.log(entry['@id'], entry['http://rdfs.org/sioc/ns#content'][0]['@value']);
        }
      }
    })
  }
}

// function makeLocalId(parts: string[]): string {
//   return parts.join(':');
// }
// async function startSlackClient(tub: Tub): Promise<void> {
//   const slackClient = new SlackClient();
//   await slackClient.create('');
//   await slackClient.start(8080);
//   slackClient.on('message', async (message: IMessage) => {
//     console.info('----------onMessage-----------');
//     const tubsChannelId = await tub.getId(
//       makeLocalId(['slack', 'channel', message.channel]),
//     );
//     const tubsMsgId = await tub.getId(
//       makeLocalId(['slack', 'message', message.client_msg_id]),
//     );
//     const messageToStore = {
//       id: tubsMsgId,
//       text: message.text,
//       channel: tubsChannelId,
//     };
//     tub.setData(tubsMsgId, messageToStore);
//     console.log(JSON.stringify(message, null, 2));
//   });
// }

// ...
run();
