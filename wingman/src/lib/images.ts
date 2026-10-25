import * as ImagePicker from 'expo-image-picker';

import type { ImageInput } from './schemas';

export const MAX_SCREENSHOTS = 10;

export type PickedImage = ImageInput & { uri: string };

const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'] as const;

function toInput(asset: ImagePicker.ImagePickerAsset): PickedImage | null {
  // Native pickers return JPEG base64; web returns a data URL in `uri`.
  if (asset.base64) {
    return { uri: asset.uri, base64: asset.base64, mediaType: 'image/jpeg' };
  }
  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(asset.uri);
  if (!match) return null;
  const mediaType = SUPPORTED.find((type) => type === match[1]);
  return mediaType ? { uri: asset.uri, base64: match[2], mediaType } : null;
}

export async function pickScreenshots(limit: number): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    base64: true,
    quality: 0.6,
  });
  if (result.canceled) return [];
  return result.assets.map(toInput).filter((image): image is PickedImage => image !== null);
}
