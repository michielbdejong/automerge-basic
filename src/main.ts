import { Tub } from './tub.js';

async function run(): Promise<void> {
  const tub1 = new Tub('1');
  const tub2 = new Tub('2');
  const docUrl = tub1.createDoc();
  tub1.setText();
  await tub2.setDoc(docUrl);
  tub2.addText();
}

// ...
run();