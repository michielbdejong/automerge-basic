import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Tub } from './tub.js';
import { SlackClient, IMessage } from './SlackClient.js';

createServer((req: IncomingMessage, res: ServerResponse) => {
  req.on('data', (chunk) => {
    console.log(chunk);
  });
  res.end('ok');
}).listen(8080);

async function run(): Promise<void> {
  const tub1 = new Tub('1');
  const tub2 = new Tub('2');
  const docUrl = tub1.createDoc();
  await startSlackClient(tub1);
  tub1.setText();
  await tub2.setDoc(docUrl);
  tub2.addText();
}

function makeLocalId(parts: string[]): string {
  return parts.join(':');
}
async function startSlackClient(tub: Tub): Promise<void> {
  const slackClient = new SlackClient();
  await slackClient.create('');
  await slackClient.start(8080);
  slackClient.on('message', async (message: IMessage) => {
    console.info("----------onMessage-----------");
    const tubsChannelId = await tub.getId(makeLocalId(['slack', 'channel', message.channel]));
    const tubsMsgId = await tub.getId(makeLocalId(['slack', 'message', message.client_msg_id]));
    const messageToStore = {
      id: tubsMsgId,
      text: message.text,
      channel: tubsChannelId,
    }
    tub.setData(tubsMsgId, messageToStore);
    console.log(JSON.stringify(message, null, 2));
  });
}

// ...
run();
