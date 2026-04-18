import { Elysia, t } from "elysia";
import { getProfileByHandle } from "../db/queries/profiles";

export const profilesRoutes = new Elysia({ prefix: "/api" }).get(
  "/profiles/:handle",
  async ({ params, set }) => {
    const view = await getProfileByHandle(params.handle);
    if (!view) {
      set.status = 404;
      return { error: "not_found", message: "Profile not found" };
    }
    return view;
  },
  { params: t.Object({ handle: t.String() }) },
);
