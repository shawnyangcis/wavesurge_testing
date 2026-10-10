import type { Tools } from './agent.ts';
import type { Store } from './store.ts';
import type { Message, Task } from '../shared/contracts.ts';
import { taskFacts } from './task-facts.ts';
export function basicTools(store: Store): Tools {
  return {
    definitions: [
      { type: 'function', function: { name: 'get_tasks', description: '获取当前真实任务事实。进度答复必须先调用。', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
      { type: 'function', function: { name: 'search_history', description: '按关键词召回原始会话历史。历史状态不能用作当前进度。', parameters: { type: 'object', required: ['query'], properties: { query: { type: 'string', minLength: 1, maxLength: 100 } }, additionalProperties: false } } }
    ],
    async execute(name, args) {
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('工具参数必须是对象');
      if (name === 'get_tasks') return taskFacts(store);
      if (name === 'search_history') {
        const query = (args as { query?: unknown }).query;
        if (typeof query !== 'string' || !query.trim() || query.length > 100) throw new Error('请输入 1–100 字的历史关键词');
        return store.list<Message>('message').filter(message => message.text.includes(query)).slice(-20);
      }
      throw new Error('工具不存在');
    }
  };
}
