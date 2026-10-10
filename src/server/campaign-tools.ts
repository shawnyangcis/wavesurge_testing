import type { Tools } from './agent.ts';
import type { CampaignService } from './campaign.ts';
import type { Campaign } from '../shared/campaign.ts';
import { campaignSchema } from '../shared/campaign.ts';
import { registerWork } from './work-delivery.ts';
export function campaignTools(service: CampaignService, base: Tools): Tools {
  return { definitions: [...base.definitions,
    { type: 'function', function: { name: 'save_campaign_plan', description: '从用户目标和交互澄清形成分组方案并保存草案。每组说明该类型如何支持目标，明确人数、候选预算、平台/地区/粉丝与必选条件、偏好。提案尚不启动搜索。id/revision 用于修改未启动草案，版本防止覆盖；已启动方案需另建草案。', parameters: { type: 'object', required: ['plan'], additionalProperties: false, properties: { plan: campaignSchema, id: { type: 'string' }, revision: { type: 'integer', minimum: 1 } } } } },
    { type: 'function', function: { name: 'get_campaigns', description: '查询持久 Campaign 方案和当前去重后分组/总配额完成情况。', parameters: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' } } } } },
    { type: 'function', function: { name: 'start_campaign', description: '仅在用户明确同意当前版本范围与配额后启动。子任务读取原始资料或已有名单并本地核验；没有平台付费搜索或外联权限；跨组同一平台账号总人数只算一次。不能用进度提问重复启动。', parameters: { type: 'object', required: ['id', 'revision'], additionalProperties: false, properties: { id: { type: 'string' }, revision: { type: 'integer', minimum: 1 } } } } }
  ], async execute(name, args, callId) {
    if (['save_campaign_plan', 'get_campaigns', 'start_campaign'].includes(name)) {
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Campaign 参数不正确'); const input = args as { plan?: unknown; id?: unknown; revision?: unknown };
      if (input.id !== undefined && (typeof input.id !== 'string' || !input.id) || input.revision !== undefined && (!Number.isInteger(input.revision) || (input.revision as number) < 1)) throw new Error('Campaign 编号或版本不正确');
      if (name === 'save_campaign_plan') return service.save(input.plan, callId, input.id as string | undefined, input.revision as number | undefined);
      if (name === 'start_campaign') { if (!input.id || input.revision === undefined) throw new Error('请指定已确认的 Campaign 与版本'); const started = service.store.get<{ childTaskIds: string[] }>('campaign', input.id as string)?.childTaskIds.length; const campaign = service.start(input.id as string, input.revision as number); if (!started) registerWork(service.store, callId, { kind: 'campaign', id: campaign.id, title: campaign.title, reportUrl: `/api/campaigns/${campaign.id}/report` }); return service.store.get('campaign', campaign.id); }
      if (!input.id) return service.facts(); const campaign = service.store.get<Campaign>('campaign', input.id as string); if (!campaign) throw new Error('Campaign 不存在'); const { results: _results, ...summary } = service.summary(campaign); return summary;
    }
    return base.execute(name, args, callId);
  } };
}
