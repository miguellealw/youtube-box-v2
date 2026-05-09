/**
 * Runs `tasks` with at most `limit` executing concurrently.
 *
 * Like Promise.allSettled, it always resolves (never rejects) and returns a
 * result tuple for every task in the original order.
 */
export async function allSettledLimited<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++
      try {
        results[index] = { status: "fulfilled", value: await tasks[index]() }
      } catch (reason) {
        results[index] = { status: "rejected", reason }
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker)
  await Promise.all(workers)
  return results
}
