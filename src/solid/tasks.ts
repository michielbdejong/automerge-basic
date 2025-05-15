type Link = {
  '@id': string;
}[];
type Val<T> = {
  '@value': string;
  '@type': T;
}[];
type TrackerIndex = {
  '@id': string;
  '@type': ['http://www.w3.org/2005/01/wf/flow#Tracker'];
  'http://purl.org/dc/elements/1.1/author': Link;
  'http://www.w3.org/2005/01/wf/flow#issueClass': Link;
  'http://www.w3.org/2005/01/wf/flow#initialState': Link;
  'http://www.w3.org/2005/01/wf/flow#stateStore': Link;
  'http://www.w3.org/2005/01/wf/flow#assigneeClass': Link;
  'http://purl.org/dc/elements/1.1/created': Val<'http://www.w3.org/2001/XMLSchema#dateTime'>;
}[];
type TrackerState = object;

export async function fetchTracker(
  uri: string,
  authenticatedFetcher: typeof globalThis.fetch,
): Promise<{ index: TrackerIndex, state: TrackerState }> {
  const ret = await authenticatedFetcher(uri, {
    headers: {
      Accept: 'application/ld+json',
    },
  });
  const index: TrackerIndex = await ret.json();
  const stateDocUri = index[0]['http://www.w3.org/2005/01/wf/flow#stateStore'][0]['@id'];
  const state = await authenticatedFetcher(stateDocUri, {
    headers: {
      Accept: 'application/ld+json',
    },
  });
  return { index, state };
}
