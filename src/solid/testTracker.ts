import 'dotenv/config';
import { getFetcher } from './fetcher.js';
import { fetchTracker } from './tasks.js';

async function test(): Promise<void> {
    const fetcher = await getFetcher();
    fetchTracker(process.env.TRACKER_IN_SOLID, fetcher);
}

//...
test();