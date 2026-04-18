import { defineExtensionMessaging } from '@webext-core/messaging';
import type { Message } from '@/types/message';

/**
 * Typed messaging contract between all extension contexts.
 * Plan 02 content script sends 'chatDelta'; SW logs it.
 * Side panel channels (stateUpdate, etc.) are reserved for Phase 2+.
 */
export interface ProtocolMap {
  /** Content script -> SW: batch of new messages from one debounce window. */
  chatDelta(data: { messages: Message[] }): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
