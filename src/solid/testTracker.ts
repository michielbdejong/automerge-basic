import 'dotenv/config';
import { getFetcher } from './fetcher.js';
import { fetchTracker, interpret } from './tasks.js';

async function test(): Promise<void> {
  const fetcher = await getFetcher();
  const { index, state } = await fetchTracker(
    process.env.TRACKER_IN_SOLID,
    fetcher,
  );
  //   console.log(JSON.stringify(index, null, 2));
  //   console.log(JSON.stringify(state, null, 2));
  console.log(JSON.stringify(interpret({ index, state }), null, 2));
}

//...
test();
