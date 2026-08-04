import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkAndRegisterAccountForIp, type IpGuardResult } from "../ip-guard.server";
import { checkRateLimit } from "../rate-limit.server";

export const registerAccountForIp = createServerFn({ method: "POST" })
  .validator(z.object({ idToken: z.string() }))
  .handler(async ({ data }): Promise<IpGuardResult> => {
    const request = getRequest();
    if (!request) {
      return { allowed: true };
    }

    const rateLimit = checkRateLimit(request, "ip-guard.register", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) {
      return { allowed: false, code: "RATE_LIMITED", message: rateLimit.message };
    }

    return checkAndRegisterAccountForIp(request, data.idToken);
  });
