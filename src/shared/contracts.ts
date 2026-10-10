export type Message = { id: string; role: 'user' | 'assistant'; text: string; createdAt: number; epoch: number; state: 'pending' | 'delivered'; attachments: string[] };
export type Task = { id: string; title: string; status: 'queued' | 'running' | 'needs_input' | 'completed' | 'partial' | 'failed' | 'cancelled'; requested: number; evaluated: number; matched: number; updatedAt: number; detail: string; qualifying?: number; resultTaskId?: string; deliveryBatchId?: string; parentCampaignId?: string };
export type Snapshot = { messages: Message[]; tasks: Task[]; active: boolean; epoch: number };
export type PublicSettings = { baseUrl: string; modelId: string; compressionThreshold: number; systemPrompt: string; workflowPrompt: string; verificationPrompt: string; compressionPrompt: string; revision: number };
export const imagePattern = '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$';
export function validImage(value: unknown) { return typeof value === 'string' && value.length <= 2800000 && new RegExp(imagePattern).test(value); }
