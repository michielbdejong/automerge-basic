import { loadYamlLens, reverseLens, applyLensToDoc, LensSource } from 'cambria';
// import { loadYamlLens, applyLensToDoc } from 'cambria';
import { MessageDrop } from './drops.js';
import { IMessage } from './SlackClient.js';

const lensYaml = `
lens:
- rename:
    source: localId
    destination: ts
- remove: { name: model, type: string }
- remove: { name: date, type: date }
- rename:
    source: authorId
    destination: user
- rename:
    source: channelId
    destination: channel
`;
// - add:
//     name: metadata
//     type: object
// - plunge:
//     name: foreignIds
//     host: metadata
// - in:
//     name: metadata
//     lens:
//       - add:
//           name: event_type
//           type: string
//       - add:
//           name: event_payload
//           type: object
//       - plunge:
//           name: foreignIds
//           host: event_payload


// - mapping:
//     - model: event_type
//         - message: from_tubs
//     - event_type: model
//         - from_tubs: message
// - plunge:
//     name: event_type
//     host: metadata
// - add:
//     name: event_payload
//     type: object
// - plunge:
//     name: event_type
//     host: metadata
// - plunge:
//     name: foreignIds
//     host: metadata

async function run(): Promise<void> {
  const lens: LensSource = loadYamlLens(lensYaml);
  const drop: MessageDrop = {
    model: 'message',
    localId: '1234.567',
    foreignIds: {
      tubs: '12345',
      solid: 'https://example.com/#Msg',
    },
    date: new Date(),
    text: 'Hello', 
    authorId: 'U0816RHEE85',
    channelId: 'C08RHPHV05D',
  };
  const newDoc = applyLensToDoc(lens, drop);
  console.log(newDoc);

  const fromSlack: IMessage = {
    ts: '1234.567',
    text: 'Hello', 
    user: 'U0816RHEE85',
    channel: 'C08RHPHV05D',
    metadata: {
      event_type: 'from_tubs',
      event_payload: {
        foreignIds: {
          tubs: '12345',
          solid: 'https://example.com/#Msg',
        },
      },
    },
  };
  const reversed = applyLensToDoc(reverseLens(lens), fromSlack);
  console.log(reversed);
}

// ...
run();


// output:
// {
//   channel: 'C08RHPHV05D',
//   user: 'U0816RHEE85',
//   ts: '1234.567',
//   foreignIds: { tubs: '12345', solid: 'https://example.com/#Msg' },
//   text: 'Hello'
// }
// {
//   localId: '1234.567',
//   authorId: 'U0816RHEE85',
//   channelId: 'C08RHPHV05D',
//   text: 'Hello',
//   metadata: { event_type: 'from_tubs', event_payload: { foreignIds: [Object] } },
//   model: ''
// }