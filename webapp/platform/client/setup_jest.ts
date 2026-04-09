import nodeFetch from 'node-fetch';
globalThis.fetch = nodeFetch as unknown as typeof fetch;