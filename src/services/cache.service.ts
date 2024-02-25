import NodeCache from 'node-cache';

const nodeCache = new NodeCache();

const setCache = async (
  key: string,
  value: string | number | any,
  ttl: number = 10,
) => {
  return nodeCache.set(key, value, ttl);
};

const getCache = (key: string) => {
  return nodeCache.get(key);
};

const cacheService = {
  set: setCache,
  get: getCache,
};
export default cacheService;
