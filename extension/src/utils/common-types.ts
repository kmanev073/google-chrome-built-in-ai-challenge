export type UrlStatus = 'unknown' | 'safe' | 'suspicious' | 'dangerous';

export type PopupInfo = {
  urlStatus: UrlStatus;
  urlsScanned: number;
  threatsBlocked: number;
};
