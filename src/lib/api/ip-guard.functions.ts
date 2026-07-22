import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkAndRegisterAccountForIp, type IpGuardResult } from "../ip-guard.server";

export const registerAccountForIp = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), name: z.string().optional() }))
  .handler(async ({ data }): Promise<IpGuardResult> => {
    const request = getRequest();
    if (!request) {
      return { allowed: true };
    }
    return checkAndRegisterAccountForIp(request, data.email.trim().toLowerCase(), (data.name ?? "").trim());
  });
