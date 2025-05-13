// import { loadYamlLens, reverseLens, applyLensToDoc, LensSource } from 'cambria';
import { loadYamlLens, applyLensToDoc } from 'cambria';
const lensYaml = `
lens:
- add:
   name: completed
   type: boolean
`;

async function run(): Promise<void> {
    const lens = loadYamlLens(lensYaml);
    const drop = { title: 'Found a bug' };
    const newDoc = applyLensToDoc(lens, drop);
    console.log(newDoc);
}

// ...
run();