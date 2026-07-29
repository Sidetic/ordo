/**
 * Server info endpoint (unauthenticated).
 */
import { ServerRoutes } from "@ordo/shared";
import { api } from "./client";

export const serverApi = {
  info: () => api.get<typeof ServerRoutes.info.response>(ServerRoutes.info.path, { auth: false }),
};
