/**
 * BATCH SPLIT NODE
 * Splits an array into chunks of a given size.
 * Useful for rate-limiting: process 50 items at a time instead of 1000 at once.
 *
 * Config:
 *   arrayPath  — dot-path to the array in input (blank = use input directly)
 *   batchSize  — number of items per batch (default: 10)
 *   outputKey  — key for each batch (default: "batch")
 *
 * Output: array of batch objects
 *   [{ batch: [...], batchIndex: 0, batchCount: 5, isLast: false }, ...]
 */

function getPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

export default {
  async run(config, input) {
    const { arrayPath, batchSize = 10, outputKey = "batch" } = config;
    const size = Math.max(1, Number(batchSize));

    const src = arrayPath ? getPath(input, arrayPath) : input;
    const arr = Array.isArray(src) ? src : [src];

    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }

    const batchCount = chunks.length;
    return chunks.map((chunk, idx) => ({
      [outputKey]: chunk,
      batchIndex: idx,
      batchCount,
      batchSize: chunk.length,
      isLast: idx === batchCount - 1,
    }));
  },
};
