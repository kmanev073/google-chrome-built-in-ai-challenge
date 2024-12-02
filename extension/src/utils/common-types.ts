export type UrlStatus = 'unknown' | 'safe' | 'suspicious' | 'dangerous';

export type PopupInfo = {
  url: string;
  urlStatus: UrlStatus;
  urlsScanned: number;
  threatsBlocked: number;
};
