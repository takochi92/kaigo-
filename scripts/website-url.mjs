// Do not guess a corrected destination from malformed public-source values.
export function websiteUrl(value) {
  let input = String(value || '').trim();
  if (/^www\./i.test(input)) input = 'https://' + input;
  if (!/^https?:\/\//i.test(input) || /[\s＠]/u.test(input)) return '';
  try {
    const url = new URL(input);
    if (url.username || url.password || !url.hostname.includes('.')) return '';
    return url.href;
  } catch { return ''; }
}
