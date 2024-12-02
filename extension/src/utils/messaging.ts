import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  getPageLanguages(): string[];
  setCount(data: number): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
