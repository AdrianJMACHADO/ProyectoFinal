import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '../config/firebase';
import { getActiveFirebaseApp } from '../config/firebase';

export type PdfTemplateConfig = {
  active: boolean;
  downloadUrl?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
  contentType?: string;
  updatedAt?: unknown;
  updatedBy?: string;
};

const configRef = () =>
  doc(getFirebaseDb(), 'configuracion', 'plantillaPdf');

let cachedBackground: { key: string; dataUrl: string } | null = null;
let cachedBusiness: { projectId: string; name: string } | null = null;

const fileUriToDataUrl = async (
  uri: string,
  contentType = 'image/png',
): Promise<string> => {
  if (uri.startsWith('data:')) return uri;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const localUri = uri.startsWith('http')
    ? (
        await FileSystem.downloadAsync(
          uri,
          `${FileSystem.cacheDirectory}lauvetickets_pdf_background`,
        )
      ).uri
    : uri;
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${contentType};base64,${base64}`;
};

export const getDefaultTemplateAsset = async () => {
  const asset = Asset.fromModule(require('../assets/images/Plantilla.png'));
  await asset.downloadAsync();
  return asset;
};

export const getPdfBusinessName = async (): Promise<string> => {
  const projectId = getActiveFirebaseApp().options.projectId ?? 'LaUveTickets';
  if (cachedBusiness?.projectId === projectId) return cachedBusiness.name;

  let name = '';
  try {
    const snapshot = await getDoc(doc(getFirebaseDb(), 'configuracion', 'system'));
    const storedName = snapshot.exists() ? snapshot.data().nombreNegocio : null;
    if (typeof storedName === 'string') name = storedName.trim();
  } catch {
    // Los proyectos antiguos pueden no exponer todavía este documento.
  }

  if (!name) {
    name =
      projectId === 'lauvetickets'
        ? 'LaUveTickets'
        : projectId
            .replace(/^luve-/i, '')
            .replace(/-[a-f0-9]{6,}$/i, '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, character => character.toUpperCase());
  }
  cachedBusiness = { projectId, name };
  return name;
};

export const subscribePdfTemplate = (
  onData: (config: PdfTemplateConfig | null) => void,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    configRef(),
    snapshot =>
      onData(snapshot.exists() ? (snapshot.data() as PdfTemplateConfig) : null),
    error => onError?.(error),
  );

export const uploadPdfTemplate = async ({
  uri,
}: {
  uri: string;
  width: number;
  height: number;
  contentType?: string;
}) => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Debes iniciar sesión');
  let optimizedBase64 = '';
  for (const compress of [0.78, 0.64, 0.5]) {
    const optimized = await manipulateAsync(
      uri,
      [{ resize: { width: 1103, height: 1426 } }],
      { compress, format: SaveFormat.JPEG, base64: true },
    );
    optimizedBase64 = optimized.base64 ?? '';
    if (optimizedBase64.length <= 780_000) break;
  }
  if (!optimizedBase64 || optimizedBase64.length > 780_000) {
    throw new Error(
      'La imagen contiene demasiado detalle para guardarla de forma gratuita',
    );
  }
  const dataUrl = `data:image/jpeg;base64,${optimizedBase64}`;
  const config: PdfTemplateConfig = {
    active: true,
    dataUrl,
    width: 1103,
    height: 1426,
    contentType: 'image/jpeg',
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  };
  await setDoc(configRef(), config, { merge: true });
  cachedBackground = null;
  return config;
};

export const useDefaultPdfTemplate = async () => {
  await setDoc(
    configRef(),
    {
      active: false,
      updatedAt: serverTimestamp(),
      updatedBy: getFirebaseAuth().currentUser?.uid ?? null,
    },
    { merge: true },
  );
  cachedBackground = null;
};

export const getPdfBackgroundDataUrl = async (): Promise<string> => {
  let config: PdfTemplateConfig | null = null;
  try {
    const snapshot = await getDoc(configRef());
    config = snapshot.exists()
      ? (snapshot.data() as PdfTemplateConfig)
      : null;
  } catch {
    // El PDF predeterminado sigue funcionando aunque aún no se hayan
    // actualizado las reglas de un negocio existente.
    config = null;
  }
  const custom =
    config?.active && typeof config.dataUrl === 'string'
      ? config.dataUrl
      : null;
  const key = custom ?? 'default';
  if (cachedBackground?.key === key) return cachedBackground.dataUrl;

  let uri: string;
  let contentType = 'image/png';
  if (custom) {
    uri = custom;
    contentType = config?.contentType ?? contentType;
  } else {
    const asset = await getDefaultTemplateAsset();
    uri = asset.localUri ?? asset.uri;
  }
  const dataUrl = await fileUriToDataUrl(uri, contentType);
  cachedBackground = { key, dataUrl };
  return dataUrl;
};
