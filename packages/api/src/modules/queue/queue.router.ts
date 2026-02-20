import { publicProcedure } from "../../index";
import { getJobRunnerStatus } from "./queue.runner";
import { jobStatusSchema } from "./queue.schema";

export const queueRouter = {
  status: publicProcedure
    .output(jobStatusSchema)
    .handler(async () => {
      return getJobRunnerStatus();
    }),
};
