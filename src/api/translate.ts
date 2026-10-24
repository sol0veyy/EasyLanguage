import { http } from '@/app/config/http';

export interface Translation {
  text: string;
  detectedLanguageCode: string;
}

export async function translate(text: string) {
  const { data } = await http.post<Translation[]>('translate', { text });

  return data;
}
