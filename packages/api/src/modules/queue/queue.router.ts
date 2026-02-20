import { publicProcedure } from "../../index";
import { getJobRunnerStatus } from "./runner";
import { jobStatusSchema } from "./queue.schema";

export const queueRouter = {
  status: publicProcedure
    .output(jobStatusSchema)
    .handler(async () => {
      return getJobRunnerStatus();
    }),
};
