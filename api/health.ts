import { getDeploymentEnvironment, json, setCommonHeaders, type HandlerRequest, type HandlerResponse } from './_http.js'

export default async function handler(_req: HandlerRequest, res: HandlerResponse) {
  setCommonHeaders(res, 'no-store')

  json(res, 200, {
    ok: true,
    environment: getDeploymentEnvironment(),
    providers: {
      flightOffers: Boolean(process.env.DUFFEL_API_TOKEN),
      supabase: Boolean(
        (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
          process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
    },
  })
}
