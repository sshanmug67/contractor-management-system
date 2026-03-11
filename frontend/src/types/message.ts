export interface Message {
  id: string;
  workgroup_id: string;
  sender_id: string;
  sender_type: 'owner' | 'manager' | 'contractor' | 'system' | 'ai';
  sender_name: string;
  content: string;
  msg_type: MessageType;
  ai_summary?: string;
  attachments?: Attachment[];
  created_at: string;
}

export type MessageType =
  | 'text'
  | 'photo'
  | 'receipt'
  | 'invoice'
  | 'document'
  | 'system'
  | 'ai_insight';

export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  ai_category?: string;
  ai_analysis?: Record<string, unknown>;
}

export interface SendMessageRequest {
  content: string;
  msg_type?: MessageType;
  attachments?: string[]; // upload IDs
}
