import { defineExtensionMessaging } from '@webext-core/messaging';
import { PopupInfo } from './common-types';

interface ProtocolMap {
  getPageLanguages(): string[];
  getPageInfo(url: string): PopupInfo;
  newPageInfo(info: PopupInfo): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
