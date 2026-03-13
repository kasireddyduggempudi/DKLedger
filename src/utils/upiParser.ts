export interface UPIParsedData {
  upiId: string;
  name?: string;
  amount?: number;
}

const UPI_URI_PATTERN = /upi:\/\/pay\?[^\s"]+/i;

const toNumber = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeRawText = (rawValue: string): string =>
  rawValue.replace(/[\n\r\t]+/g, '').trim();

const extractUpiUri = (rawValue: string): string | null => {
  const normalized = normalizeRawText(rawValue);
  if (!normalized) {
    return null;
  }

  const directMatch = normalized.match(UPI_URI_PATTERN)?.[0];
  if (directMatch) {
    return directMatch;
  }

  const decoded = safeDecode(normalized);
  const decodedMatch = decoded.match(UPI_URI_PATTERN)?.[0];
  if (decodedMatch) {
    return decodedMatch;
  }

  if (decoded.toLowerCase().startsWith('upi://pay?')) {
    return decoded;
  }

  return null;
};

const parseQueryString = (upiUri: string): Record<string, string> => {
  const queryIndex = upiUri.indexOf('?');
  if (queryIndex === -1) {
    return {};
  }

  const query = upiUri.slice(queryIndex + 1).split('#')[0];
  const items = query.split('&');
  const params: Record<string, string> = {};

  items.forEach(item => {
    if (!item) {
      return;
    }

    const [rawKey, ...rest] = item.split('=');
    const rawValuePart = rest.join('=');

    const key = safeDecode((rawKey ?? '').trim()).toLowerCase();
    const value = safeDecode(rawValuePart.replace(/\+/g, ' ')).trim();

    if (key) {
      params[key] = value;
    }
  });

  return params;
};

export const parseUpiQrData = (rawValue: string): UPIParsedData | null => {
  if (!rawValue) {
    return null;
  }

  const upiUri = extractUpiUri(rawValue);
  if (!upiUri) {
    return null;
  }

  const params = parseQueryString(upiUri);
  const upiId = params.pa?.trim();

  if (!upiId || !upiId.includes('@')) {
    return null;
  }

  const name = params.pn?.trim() || undefined;
  const amount = toNumber(params.am);

  return {
    upiId,
    name,
    amount,
  };
};
