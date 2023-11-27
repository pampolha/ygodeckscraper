import { Cluster } from "puppeteer-cluster";
import Os from "os";
import { ConcurrencyImplementationClassType } from "puppeteer-cluster/dist/concurrency/ConcurrencyImplementation";

const loadCluster = async (
  concurrencyModel:
    | number
    | ConcurrencyImplementationClassType = Cluster.CONCURRENCY_CONTEXT,
  maxConcurrency = Os.cpus().length,
  retryLimit = 3,
  retryDelay = 5000,
  workerCreationDelay = 1000
) => {
  const cluster = await Cluster.launch({
    concurrency: concurrencyModel,
    maxConcurrency,
    retryLimit,
    retryDelay,
    workerCreationDelay,
  });
  cluster.on("taskerror", (err, data, willRetry) => {
    if (willRetry) {
      console.warn(
        `Encountered an error while saving deck ${data}: ${err.message}\nThis job will be retried`
      );
    } else {
      console.error(
        `Failed to save deck ${data}: ${err.message}.\nMaximum attempts reached`
      );
    }
  });
  return cluster;
};

export default loadCluster;
