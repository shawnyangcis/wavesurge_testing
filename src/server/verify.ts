import type { Model } from './model.ts';
import type { SettingsManager } from './settings.ts';
import type { Assessment, Creator, Judgment, SearchSpec } from '../shared/research.ts';
import { judgmentTool } from './browser-verifier.ts';
import { verificationCreator } from './instagram.ts';
export function modelVerifier(model: Model, settings: SettingsManager) {
  return async (spec: SearchSpec, creator: Creator, taskId: string): Promise<Judgment[] | Assessment> => {
    const result = await model.complete([{ role: 'system', content: settings.current().systemPrompt }, { role: 'system', content: settings.current().verificationPrompt }, { role: 'user', content: JSON.stringify({ spec, creator: verificationCreator(creator), taskId, observedAt: new Date().toISOString(), instruction: '本次调用只复用 creator.evidence 中已取得的文字资料；spec 的 verificationMode 可能来自原研究，但本次未提供浏览器工具，也没有重新打开页面。按各条 provider、来源和采集时间判断，资料可能来自 WaveSurge 或此前浏览器观察。没有实际传入的截图像素时，视觉条件保持 unknown。不要将头像链接或截图编号视为已观察图片。使用 submit_judgments 提交。judgments仅对应spec.criteria真实id；criteria为空时必须提交judgments=[]，不能发明占位条件。' }) }], [judgmentTool(spec)], 0, 'verification');
    const submission = result.tool_calls?.find(call => call.function.name === 'submit_judgments');
    if (!submission) throw new Error('模型没有提交逐条件判断');
    const parsed = JSON.parse(submission.function.arguments);
    if (!Array.isArray(parsed.judgments)) throw new Error('模型判断列表格式不正确');
    return parsed.annotations || parsed.facts ? parsed : parsed.judgments;
  };
}
