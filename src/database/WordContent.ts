/** Helpers for safely reading the JSON string stored in WordTable.content. */
export interface WordContentData {
  word?: string;
  meaning?: string;
  pronunciation?: string;
  bn_meaning?: string;
  en_meaning?: string;
  example_bn?: string;
  example_en?: string;
  synonyms?: string[];
  antonyms?: string[];
  tts_text?: string[];
  [key: string]: unknown;
}

export function parseWordContent(content: string | null | undefined): WordContentData {
  if (!content) return {};
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed === 'string') return {word: parsed};
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as WordContentData;
    }
  } catch {
    // Support old rows where content was stored as plain text.
  }
  return {word: content};
}

export function getWordTitle(content: string | null | undefined): string {
  const data = parseWordContent(content);
  return String(data.word ?? data.word_text ?? content ?? '').trim();
}

export function getReadableWordContent(content: string | null | undefined): string {
  const data = parseWordContent(content);
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    if (typeof value === 'string' && value.trim()) lines.push(`${label}: ${value.trim()}`);
  };
  add('Word', data.word);
  add('Meaning', data.meaning);
  add('Pronunciation', data.pronunciation);
  add('বাংলা অর্থ', data.bn_meaning);
  add('English meaning', data.en_meaning);
  add('উদাহরণ', data.example_bn);
  add('Example', data.example_en);
  if (Array.isArray(data.synonyms) && data.synonyms.length) lines.push(`সমার্থক: ${data.synonyms.join(', ')}`);
  if (Array.isArray(data.antonyms) && data.antonyms.length) lines.push(`বিপরীত: ${data.antonyms.join(', ')}`);
  if (Array.isArray(data.tts_text) && data.tts_text.length) lines.push(data.tts_text.join(' '));
  return lines.join('\n') || String(content ?? '');
}
