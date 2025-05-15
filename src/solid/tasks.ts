type TrackerIndex = {
  '@id': string;
  'http://purl.org/dc/elements/1.1/author': object;
  '@type': ['http://www.w3.org/2005/01/wf/flow#Tracker'];
  'http://purl.org/dc/elements/1.1/created': object;
  'http://www.w3.org/2005/01/wf/flow#issueClass': object;
  'http://www.w3.org/2005/01/wf/flow#initialState': object;
  'http://www.w3.org/2005/01/wf/flow#stateStore': object;
  'http://www.w3.org/2005/01/wf/flow#assigneeClass': object;
};

export async function fetchTracker(
  uri: string,
  authenticatedFetcher: typeof globalThis.fetch,
): Promise<void> {
  const ret = await authenticatedFetcher(uri, {
    headers: {
      Accept: 'application/ld+json',
    },
  });
  const data: TrackerIndex = await ret.json();
  console.log(JSON.stringify(data, null, 2));
}
