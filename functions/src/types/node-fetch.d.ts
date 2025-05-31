// functions/src/types/node-fetch.d.ts
declare module 'node-fetch' {
  const fetch: typeof import('undici-types').fetch;
  export default fetch;
  export type {
    RequestInfo,
    RequestInit,
    ResponseInit,
    HeadersInit,
    BodyInit,
    RequestRedirect,
    RequestDuplex,
    ReferrerPolicy,
    RequestCredentials,
    RequestDestination,
    RequestMode,
    RequestCache,
    Body,
    Headers,
    Request,
    Response,
  } from 'undici-types';
}
