import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  setCount(data: number): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
