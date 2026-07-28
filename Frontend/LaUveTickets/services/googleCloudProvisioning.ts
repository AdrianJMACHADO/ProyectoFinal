import { FirebaseConnectionConfig } from '../config/firebase';
import { TENANT_FIRESTORE_RULES } from '../config/tenantFirestoreRules';

const RESOURCE_MANAGER = 'https://cloudresourcemanager.googleapis.com/v3';
const SERVICE_USAGE = 'https://serviceusage.googleapis.com/v1';
const FIREBASE_MANAGEMENT = 'https://firebase.googleapis.com/v1beta1';
const FIRESTORE_ADMIN = 'https://firestore.googleapis.com/v1';
const FIREBASE_RULES = 'https://firebaserules.googleapis.com/v1';
const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/admin/v2';

export type ProvisioningStage =
  | 'project'
  | 'services'
  | 'firebase'
  | 'database'
  | 'authentication'
  | 'rules'
  | 'application';

export interface ProvisioningProgress {
  stage: ProvisioningStage;
  message: string;
}

export interface RecoverableFirebaseProject {
  projectId: string;
  displayName: string;
  config: FirebaseConnectionConfig;
}

interface GoogleOperation<T = Record<string, any>> {
  name: string;
  done?: boolean;
  error?: { code?: number; message?: string };
  response?: T;
}

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const retryWhileGooglePropagates = async <T>(
  action: () => Promise<T>,
  attempts = 10,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      const message = (error as Error).message.toLowerCase();
      const retryable =
        message.includes('permission') ||
        message.includes('forbidden') ||
        message.includes('403') ||
        message.includes('404') ||
        message.includes('not found') ||
        message.includes('has not been used') ||
        message.includes('disabled');
      if (!retryable || attempt === attempts) throw error;
      await wait(Math.min(5000 * attempt, 20000));
    }
  }
  throw lastError;
};

const readApiError = async (response: Response) => {
  const body = await response.json().catch(() => null);
  return (
    body?.error?.message ||
    body?.message ||
    `Google respondió con el error ${response.status}`
  );
};

const googleRequest = async <T>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const pollOperation = async <T>(
  operationUrl: string,
  accessToken: string,
  timeoutMs = 180_000,
): Promise<T> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const operation = await googleRequest<GoogleOperation<T>>(
      operationUrl,
      accessToken,
    );
    if (operation.error) {
      throw new Error(operation.error.message || 'Google no pudo completar la operación');
    }
    if (operation.done) return operation.response as T;
    await wait(1800);
  }

  throw new Error('Google tardó demasiado en preparar el proyecto');
};

const operationUrl = (baseUrl: string, name: string) =>
  `${baseUrl}/${name.replace(/^\/+/, '')}`;

const enableServices = async (projectId: string, accessToken: string) => {
  const operation = await googleRequest<GoogleOperation>(
    `${SERVICE_USAGE}/projects/${projectId}/services:batchEnable`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        serviceIds: [
          'firebase.googleapis.com',
          'firestore.googleapis.com',
          'firebaserules.googleapis.com',
          'identitytoolkit.googleapis.com',
        ],
      }),
    },
  );

  await pollOperation(
    operationUrl(SERVICE_USAGE, operation.name),
    accessToken,
  );
};

const addFirebase = async (projectId: string, accessToken: string) => {
  try {
    const operation = await googleRequest<GoogleOperation>(
      `${FIREBASE_MANAGEMENT}/projects/${projectId}:addFirebase`,
      accessToken,
      { method: 'POST', body: '{}' },
    );
    await pollOperation(
      operationUrl(FIREBASE_MANAGEMENT, operation.name),
      accessToken,
    );
  } catch (error) {
    if (!(error as Error).message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }
};

const createFirestore = async (
  projectId: string,
  accessToken: string,
  locationId: string,
) => {
  try {
    const operation = await googleRequest<GoogleOperation>(
      `${FIRESTORE_ADMIN}/projects/${projectId}/databases?databaseId=${encodeURIComponent('(default)')}`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'FIRESTORE_NATIVE',
          locationId,
          deleteProtectionState: 'DELETE_PROTECTION_ENABLED',
        }),
      },
    );
    await pollOperation(
      operationUrl(FIRESTORE_ADMIN, operation.name),
      accessToken,
    );
  } catch (error) {
    if (!(error as Error).message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }
};

const configureEmailAuthentication = async (
  projectId: string,
  accessToken: string,
) => {
  await googleRequest(
    `${IDENTITY_TOOLKIT}/projects/${projectId}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({
        signIn: {
          email: { enabled: true, passwordRequired: true },
        },
      }),
    },
  );
};

const configureGoogleAuthentication = async (
  projectId: string,
  accessToken: string,
) => {
  await googleRequest(
    `${IDENTITY_TOOLKIT}/projects/${projectId}/defaultSupportedIdpConfigs/google.com?updateMask=enabled`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
    },
  );
};

const deployRules = async (projectId: string, accessToken: string) => {
  const ruleset = await googleRequest<{ name: string }>(
    `${FIREBASE_RULES}/projects/${projectId}/rulesets`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        source: {
          files: [
            {
              name: 'firestore.rules',
              content: TENANT_FIRESTORE_RULES,
            },
          ],
        },
      }),
    },
  );

  await googleRequest(
    `${FIREBASE_RULES}/projects/${projectId}/releases`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: ruleset.name,
      }),
    },
  );
};

const createWebApp = async (
  projectId: string,
  businessName: string,
  accessToken: string,
): Promise<FirebaseConnectionConfig> => {
  const operation = await googleRequest<GoogleOperation<{ name: string }>>(
    `${FIREBASE_MANAGEMENT}/projects/${projectId}/webApps`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ displayName: `LaUveTickets - ${businessName}` }),
    },
  );
  const webApp = await pollOperation<{ name: string }>(
    operationUrl(FIREBASE_MANAGEMENT, operation.name),
    accessToken,
  );

  const config = await googleRequest<FirebaseConnectionConfig>(
    `${FIREBASE_MANAGEMENT}/${webApp.name}/config`,
    accessToken,
  );
  return config;
};

export const provisionFirebaseProject = async ({
  accessToken,
  projectId,
  businessName,
  locationId = 'eur3',
  projectAlreadyCreated = false,
  onProgress,
}: {
  accessToken: string;
  projectId: string;
  businessName: string;
  locationId?: string;
  projectAlreadyCreated?: boolean;
  onProgress?: (progress: ProvisioningProgress) => void;
}): Promise<FirebaseConnectionConfig> => {
  onProgress?.({ stage: 'project', message: 'Creando tu espacio privado…' });
  if (!projectAlreadyCreated) {
  const projectOperation = await googleRequest<GoogleOperation>(
    `${RESOURCE_MANAGER}/projects`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        displayName: `LaUveTickets - ${businessName}`,
        labels: { app: 'lauvetickets' },
      }),
    },
  );
  await pollOperation(
    operationUrl(RESOURCE_MANAGER, projectOperation.name),
    accessToken,
  );
  }

  onProgress?.({ stage: 'services', message: 'Preparando los servicios…' });
  // El rol Owner del creador tarda unos segundos en propagarse al proyecto
  // recién creado. Service Usage devuelve 403 durante ese intervalo.
  try {
    await retryWhileGooglePropagates(() =>
      enableServices(projectId, accessToken),
    );
  } catch (error) {
    const message = (error as Error).message.toLowerCase();
    if (
      message.includes('terms of service')
      || message.includes('terms/cloud')
      || message.includes('must be accepted')
      || message.includes('condiciones del servicio')
    ) {
      throw new FirebaseConsoleActivationRequired(projectId);
    }
    throw error;
  }

  onProgress?.({ stage: 'firebase', message: 'Activando tu almacenamiento…' });
  try {
    await retryWhileGooglePropagates(() =>
      addFirebase(projectId, accessToken),
    );
  } catch (error) {
    const message = (error as Error).message.toLowerCase();
    if (
      message.includes('permission')
      || message.includes('caller')
      || message.includes('forbidden')
    ) {
      throw new FirebaseConsoleActivationRequired(projectId);
    }
    throw error;
  }

  onProgress?.({ stage: 'database', message: 'Creando la base de datos…' });
  await retryWhileGooglePropagates(() =>
    createFirestore(projectId, accessToken, locationId),
  );

  onProgress?.({ stage: 'authentication', message: 'Preparando los usuarios…' });
  onProgress?.({ stage: 'rules', message: 'Protegiendo tus datos…' });
  await retryWhileGooglePropagates(() =>
    deployRules(projectId, accessToken),
  );

  onProgress?.({ stage: 'application', message: 'Terminando la configuración…' });
  const config = await retryWhileGooglePropagates(() =>
    createWebApp(projectId, businessName, accessToken),
  );

  try {
    await configureFirebaseAuthentication(projectId, accessToken);
  } catch (error) {
    if ((error as Error).message.includes('CONFIGURATION_NOT_FOUND')) {
      throw new FirebaseAuthenticationSetupRequired(projectId, config);
    }
    throw error;
  }

  return config;
};

export class FirebaseConsoleActivationRequired extends Error {
  constructor(public readonly projectId: string) {
    super('Debes activar Firebase una vez con tu cuenta de Google');
    this.name = 'FirebaseConsoleActivationRequired';
  }
}

export class FirebaseAuthenticationSetupRequired extends Error {
  constructor(
    public readonly projectId: string,
    public readonly config: FirebaseConnectionConfig,
  ) {
    super('Firebase Authentication necesita activarse una vez en la consola');
    this.name = 'FirebaseAuthenticationSetupRequired';
  }
}

export const configureFirebaseAuthentication = async (
  projectId: string,
  accessToken: string,
) => {
  await retryWhileGooglePropagates(() =>
    configureEmailAuthentication(projectId, accessToken),
  );
  await retryWhileGooglePropagates(() =>
    configureGoogleAuthentication(projectId, accessToken),
  );
};

export const listRecoverableFirebaseProjects = async (
  accessToken: string,
): Promise<RecoverableFirebaseProject[]> => {
  const projects: Array<{
    projectId: string;
    displayName?: string;
    state?: string;
  }> = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({
      query: 'labels.app:lauvetickets',
      pageSize: '100',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await googleRequest<{
      projects?: typeof projects;
      nextPageToken?: string;
    }>(`${RESOURCE_MANAGER}/projects:search?${params}`, accessToken);
    projects.push(...(page.projects ?? []));
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);

  const recovered = await Promise.all(
    projects
      .filter(project => project.state === 'ACTIVE')
      .map(async project => {
        try {
          const response = await googleRequest<{
            apps?: Array<{ name: string; displayName?: string; state?: string }>;
          }>(
            `${FIREBASE_MANAGEMENT}/projects/${project.projectId}/webApps`,
            accessToken,
          );
          const app = (response.apps ?? []).find(item => item.state === 'ACTIVE');
          if (!app) return null;
          const config = await googleRequest<FirebaseConnectionConfig>(
            `${FIREBASE_MANAGEMENT}/${app.name}/config`,
            accessToken,
          );
          return {
            projectId: project.projectId,
            displayName:
              project.displayName?.replace(/^LaUveTickets\s*-\s*/i, '') ||
              app.displayName?.replace(/^LaUveTickets\s*-\s*/i, '') ||
              project.projectId,
            config,
          };
        } catch {
          return null;
        }
      }),
  );

  return recovered
    .filter((item): item is RecoverableFirebaseProject => item !== null)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
};
