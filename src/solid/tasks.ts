export async function fetchTracker(uri: string, authenticatedFetcher: typeof globalThis.fetch): Promise<void> {
    const ret = await authenticatedFetcher(uri, {
        headers: {
            Accept: 'application/ld+json',
        },
    });
    const data = await ret.json();
    console.log(data);
}
