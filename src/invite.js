/**
 * Zero-Retention Invite Link Codec.
 * Encodes ONLY Person A's consent-approved NVC need-map (never their raw emotional rant)
 * into a URL-safe base64url invite link so two people can mediate across separate phones
 * with zero server-side storage of intimate conflicts.
 */

export function encodeInvitePayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeInvitePayload(token) {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !parsed.partyA || !parsed.partyA.approved) return null;
    return parsed;
  } catch {
    return null;
  }
}
