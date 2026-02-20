export const RedisKeys = {
  readyQueue: "bb:queue:ready",
  delayedQueue: "bb:queue:delayed",

  cursorLock: (cursorId) => `bb:lock:cursor:${cursorId}`,
  executionLock: (executionId) => `bb:lock:execution:${executionId}`,
};
