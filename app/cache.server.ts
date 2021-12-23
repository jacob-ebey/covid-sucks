import { createHash } from "crypto";

import { get, set, setex } from "@upstash/redis";

type CachedResponse = {
  status: number;
  statusText: string;
  body: string;
  headers: [string, string][];
};

export async function swrCache(
  request: Request,
  maxAgeSeconds: number
): Promise<Response> {
  if (request.method.toLowerCase() !== "get") {
    throw new Error("swrCache only supports GET requests");
  }

  let hash = createHash("sha256");
  hash.update(request.method);
  hash.update(request.url);
  for (let header of request.headers) {
    hash.update(header[0]);
    hash.update(header[1]);
  }
  let key = hash.digest("hex");

  let stillGoodKey = `swr:stillgood:${key}`;
  let responseKey = `swr:response:${key}`;

  let cachedStillGoodPromise = get(stillGoodKey)
    .then((cachedStillGood) => {
      if (cachedStillGood.error || !cachedStillGood.data) {
        return false;
      }
      return true;
    })
    .catch(() => false);

  let response = await get(responseKey)
    .then(async (cachedResponseString) => {
      if (cachedResponseString.error || !cachedResponseString.data) {
        return null;
      }

      let cachedResponseJson = JSON.parse(
        cachedResponseString.data
      ) as CachedResponse;
      let cachedResponse = new Response(cachedResponseJson.body, {
        status: cachedResponseJson.status,
        statusText: cachedResponseJson.statusText,
        headers: cachedResponseJson.headers,
      });

      if (await cachedStillGoodPromise) {
        cachedResponse.headers.set("X-SWR-Cache", "hit");
      } else {
        cachedResponse.headers.set("X-SWR-Cache", "stale");

        (async () => {
          let responseToCache = await fetch(request.clone());
          let toCache: CachedResponse = {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: Array.from(responseToCache.headers),
            body: await responseToCache.text(),
          };

          await set(responseKey, JSON.stringify(toCache));
          await setex(stillGoodKey, maxAgeSeconds, "true");
        })().catch((error) => {
          console.error("Failed to revalidate", error);
        });
      }

      return cachedResponse;
    })
    .catch(() => null);

  if (!response) {
    response = await fetch(request.clone());
    let responseToCache = response.clone();
    response.headers.set("X-SWR-Cache", "miss");

    (async () => {
      let toCache: CachedResponse = {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: Array.from(responseToCache.headers),
        body: await responseToCache.text(),
      };

      await set(responseKey, JSON.stringify(toCache));
      await setex(stillGoodKey, maxAgeSeconds, "true");
    })().catch((error) => {
      console.error("Failed to seed cache", error);
    });
  }

  return response;
}
