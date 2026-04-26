import { upsertUserProfile } from "./d1";
import type { ResidentIdentity, UserProfileRecord } from "./d1";
import type { WorkerEnv } from "./env";

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
    email?: string;
    displayName?: string;
    emailVerified?: boolean;
    providerUserInfo?: Array<{ providerId?: string }>;
  }>;
  error?: {
    message?: string;
  };
};

export type AuthenticatedResident = {
  identity: ResidentIdentity;
  profile: UserProfileRecord;
};

export async function authenticateResident(
  request: Request,
  env: WorkerEnv
): Promise<AuthenticatedResident | null> {
  const bearerToken = getBearerToken(request);

  if (!bearerToken) {
    return null;
  }

  const identity = await verifyResidentToken(bearerToken, env);

  if (!identity) {
    return null;
  }

  const profile = await upsertUserProfile(env.DB, identity);

  return {
    identity,
    profile
  };
}

async function verifyResidentToken(
  bearerToken: string,
  env: WorkerEnv
): Promise<ResidentIdentity | null> {
  const devIdentity = parseDevResidentToken(bearerToken, env);

  if (devIdentity) {
    return devIdentity;
  }

  if (!env.FIREBASE_WEB_API_KEY || !env.FIREBASE_PROJECT_ID) {
    return null;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      env.FIREBASE_WEB_API_KEY
    )}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ idToken: bearerToken })
    }
  );

  if (!response.ok) {
    return null;
  }

  const lookup = (await response
    .json()
    .catch(() => null)) as FirebaseLookupResponse | null;
  const user = lookup?.users?.[0];

  if (!user?.localId || !user.email) {
    return null;
  }

  return {
    providerUid: `firebase:${env.FIREBASE_PROJECT_ID}:${user.localId}`,
    email: user.email,
    displayName: user.displayName ?? null,
    authProvider: user.providerUserInfo?.[0]?.providerId ?? "firebase"
  };
}

function parseDevResidentToken(
  bearerToken: string,
  env: WorkerEnv
): ResidentIdentity | null {
  if (env.DEV_RESIDENT_AUTH !== "true" || !bearerToken.startsWith("dev:")) {
    return null;
  }

  const email = bearerToken.slice("dev:".length).trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return {
    providerUid: `dev:${email}`,
    email,
    displayName: "Local demo resident",
    authProvider: "dev"
  };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (!/^Bearer$/i.test(scheme) || !token) {
    return "";
  }

  return token;
}
