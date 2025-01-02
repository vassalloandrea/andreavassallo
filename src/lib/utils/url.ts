export function isInternalUrl(url: string): boolean {
  const baseProd = new URL("https://andreavassallo.it");
  const baseLocal = new URL("http://localhost:4321");

  try {
    const parsedUrl = new URL(url, baseProd);
    const hostname = parsedUrl.hostname;
    const isInternalHost = hostname === baseProd.hostname || hostname === baseLocal.hostname;

    return isInternalHost;
  } catch {
    return false;
  }
}
