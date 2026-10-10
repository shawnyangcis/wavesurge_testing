from pathlib import Path
import json,datetime
r=Path('.gstack/qa-reports/retest-2026-10-10-r4');p=r/'execution.json';d=json.loads(p.read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat()
M={
'ENV01':('passed','当前主部署、本轮真实/受控实例57个TS/TSX源码相符；新数据卷从0任务0结果开始。',['source-check-final.json','configuration.json']),
'BASE01':('passed','浏览器空/错误/正确登录、退出，11类未授权路由401与写入Origin403。',['foundation-ui.json','extended-ui.json']),
'BASE02':('passed','图片左右颜色识别正确，附件上传/移除/保存；无擅自搜索。',['foundation-ui.json']),
'BASE03':('passed','无效阈值拒绝；新设置revision进入下一真实模型请求，唯一标记回复成功；提示词与代理端点已还原。',['extended-ui.json','extended-prompt-audit.json','fault-ui.json']),
'BASE04':('passed','实际下载/拒绝非法JSON/闲置reset与load；有历史压缩生成可追溯checkpoint，原任务与消息保留。',['foundation-ui.json','compression-populated.json']),
'BASE05':('passed','noVNC真实连接；375px主页面、1440/768/375报告无横向溢出；实际人工控制与三个桌面重启另有证据。',['foundation-ui.json','exact-layout.json','acceptance']),
'BIZ01':('running','原话澄清后已登记20人有界研究，等待全部终态及最终文档；不提前宣称满额。',['original20.json','original20-scope.json','live-progress.json']),
'BIZ02':('running','已观察数值预筛；等待最终profileReads/baseExcluded/candidates及请求对应检查。',['prefinal-tasks.json']),
'BIZ03':('passed','真实Tyler/Val两位都逐人保存画像与引用；2合格候选选1；未知眼镜/geek不硬猜。',['exact-two-results.json','exact-two-batch.json']),
'BIZ04':('passed','真实R3 39667/39.6K原来源只读回放恢复match，区间39550–39699；新真实数值均match；边界与真冲突完整测试。',['follower-replay.json','logs/coverage.log']),
'BIZ05':('passed','受控偏好选择Bob有真实页面依据；真实结果未知geek保留；原题族裔仅本人自述。语义准确率未作总体统计。',['acceptance/natural-e2e.json','exact-two-results.json','original20-scope.json']),
'BIZ06':('partial','受控两人重新核验均本轮主页2/2，v1→v2历史保留；真实强制访问的重核尚待执行。',['interaction-regressions.json','controlled-reverify.json']),
'BIZ07':('passed','真实TikTok2人、X2人均定性并标签化，YT500条全超范围0分析；不足如实结束。',['basic-tiktok.json','text-platforms.json','live-progress.json']),
'BIZ08':('running','自然查询准确排除不戴眼镜/未知，两位0合格；3组6记录补标已同时登记，等待整批完成。子串标签查询有产品不足RG27。',['saved-glasses.json','six-retag.json','tag-semantics-ui.json']),
'DOC01':('passed','实际Chat点击HTML/CSV；指定两人、受控双项、真实Campaign均全终态后仅1最终通知。20人最终交付仍待终态。',['exact-two-batch.json','live-campaign-ui.json','phase-b-fixture-required.json']),
'DOC02':('partial','普通筛选与CSV一致、实际文档与截图可打开；RG26来源冗余，RG28并发旧响应导致CSV退回全量。',['exact-two-results.json','follower-reference-audit.json','result-race-ui.json']),
'DOC03':('partial','判断列nowrap与三宽度无横溢出已通过；粉丝来源冗余导致手机行高8827.5/5863.5px（RG26）。',['exact-layout.json']),
'CAM01':('passed','目标→4项澄清→2类草案v1；未授权时无新任务。',['campaign-goal.json','campaign-clarify.json']),
'CAM02':('passed','自然修改v2；旧版409；真实UI启动2组、重复启动幂等；旅行背包目标角色不同且未搜索。',['campaign-revise.json','campaign-start-ui.json','campaign-travel.json']),
'CAM03':('partial','真实两类各1、唯一2/2、分析4记录、最终一次报告通过；一组子报告已入选与总报告分配矛盾RG29。',['live-campaign-ui.json','campaign-consistency-ui.json']),
'BATCH01':('passed','受控租约中自然语言一次登记text/browser两项；文字2人完成、网页0、报告0；交还后网页2人新本人证据与报告1。',['phase-b-fixture-required.json']),
'BATCH02':('partial','受控明确授权变体通过；真实平台同类双项待执行。',['phase-b-fixture-required.json']),
'CTX01':('partial','受控捕获active/pending/sealed=false后实际清空，closureReason=context_changed；2结果与1报告，重启0重放。真实分支待执行。',['context-browser.json']),
'CTX02':('partial','同样时序实际载入备份，任务完成及新epoch一次交付；真实分支待执行。',['context-browser.json']),
'INT01':('passed','Agent/worker active期间3条实际消息，正确取消指定任务；旧结果不变，10秒后无晚写。',['interaction-regressions.json']),
'INT02':('passed','同ID/body200、冲突409、0重放；Campaign重复启动0新任务；非法多项事务回滚为本轮集成测试。',['interaction-regressions.json','campaign-start-ui.json','logs/coverage.log']),
'ERR01':('passed','Chat、候选选择、逐人核验各一次408→同工作200，不重启搜索/重复结果。',['fault-ui.json','fault-proxy-audit.json']),
'ERR02':('passed','真实模型代理400仅1次、明确失败；真实来源耗尽如实短缺；Wave各种错误边界为完整单元/集成层。',['fault-ui.json','live-progress.json','logs/coverage.log']),
'HUM01':('partial','真实IG/TikTok实际协助认领并明确未登录跳过，终态未知；未验证真实登录/验证码成功后的续接。',['live-progress.json']),
'HUM02':('passed','受控noVNC实际操作，Cookie/localStorage三次desktop重启均保留；到期/撤销为集成层，真实社交成功仍未验证。',['acceptance','logs/acceptance.log','phase-b-fixture-required.json','logs/coverage.log']),
'SEC01':('passed','真实桌面RPC四类禁止URL、未授权路由、Origin边界已测；敏感输入/来源归属/注入为完整集成层，不代表渗透测试。',['policy-runtime.json','extended-ui.json','logs/coverage.log']),
'PERF01':('passed','20人研究运行中，20次首页/状态样本及3次noVNC连接；p95约398/39ms，连接7.10/3.52/3.55秒。不是高并发压测。',['performance-ui.json']),
'PERSIST01':('running','受控与空闲重启已通过；全部真实任务终态后最终重启/消息/标签/版本核对待执行。',['foundation-ui.json','context-browser.json','acceptance']),
'TEST01':('passed','本轮typecheck/build通过；28文件226测试，全生产TS/TSX逐文件行/分支100%。',['logs/typecheck.log','logs/build.log','logs/coverage.log','coverage']),
'E2E01':('passed','全新Docker4/4受控业务浏览器验收通过；首启动网段耗尽为环境问题，独立空闲网段重跑，失败日志与卷保留。',['logs/acceptance-first-attempt.log','logs/acceptance.log','acceptance'])}
M.update({
'BIZ01':('passed','原话+自然澄清实际完成：88个本人基础账号，排除68，20候选全分析，0合格/3未知/17不符，5个条件+4画像逐人保存；1最终文档，不伪造满额。',['original20.json','original20-scope.json','discovery-final-audit.json','original20-batch.json','original20-results.json']),
'BIZ02':('passed','真实88/100基础读取；68已知粉丝范围外均未取帖子且不占20分析预算；3词轮转及双预算正确，指定账号例外有真实2人证据。',['discovery-final-audit.json','original20-final-tasks.json','exact-two-results.json']),
'BIZ06':('passed','真实原2人复核2/2新本人主页观察，v2→v3且v1/v2均保留、0新Wave、一次最终报告；受控新访问2/2也通过。',['instagram-reverify.json','instagram-reverify-audit.json','reverify-final-invariants.json','instagram-reverify-batch.json','interaction-regressions.json']),
'BIZ08':('partial','三组6记录/2人全部补标完成，原creator/事实/证据/条件/verdict/selected保留，v1→v2、无新研究；自然眼镜查询正确0。UI包含检索混淆正负标签F27。',['six-retag-invariants.json','six-retag-batch.json','saved-glasses.json','tag-semantics-ui.json']),
'DOC01':('passed','原题20、指定2、3组补标、多平台双项、真实/受控文字网页双项、复核、Campaign均全部终态后1最终通知；Chat实际打开HTML/下载CSV，刷新重启不重放。文档内容缺陷另见DOC04。',['original20-batch.json','exact-two-batch.json','six-retag-batch.json','text-platforms-batch.json','phase-b-real-required.json','phase-b-fixture-required.json','instagram-reverify-batch.json','live-campaign-ui.json','restart-final-ui.json']),
'DOC02':('failed','常规标签/平台/判断/组合筛选及CSV下载一致；真实旧全量响应覆盖已应用过滤2/2复现，CSV退回全量F28；粉丝引用无关来源F26。安全转义/证据截图有受控E2E与集成证据。',['exact-two-results.json','original20-results.json','tiktok-results.json','x-results.json','result-select-filter-ui.json','result-race-ui.json','follower-reference-audit.json']),
'DOC03':('partial','三宽度无横溢出、判断词不竖排已通过；F26来源冗余造成375px两条粉丝行高8827.5/5863.5px，阅读仍不足。',['exact-layout.json','follower-reference-audit.json']),
'CAM03':('partial','真实2类各1、唯一2/2、4条逐人结果、最终1次报告通过；总/子已入选标記矛盾F29，總文档缺直接匹配说明F32。',['live-campaign-ui.json','campaign-consistency-ui.json','doc04-campaign-children-ui.json']),
'BATCH01':('passed','受控两变体均一次登记2项，实际noVNC认领；text2人完成/browser0/报告0，交还后browser2个新本人观察、综合1报告。',['phase-b-fixture-required.json']),
'BATCH02':('passed','真实自然语气一次start_research_batch登记2项；人占桌面时text2完成/browser0/报告0；交还实际两本人主页新观察，帖子阻挡未知，最终综合1报告。',['phase-b-real-required.json']),
'CTX01':('passed','真实与受控均捕获active/pending/task注册/sealed=false后实际UI清空；closureReason=context_changed，2结果+新epoch一次报告，实际重启0Wave/通知重放。',['context-real-browser.json','context-browser.json']),
'CTX02':('passed','相同时序实际UI载入备份，真实与受控2结果+新epoch一次交付，未登记工作明确没执行，重启0重放。',['context-real-browser.json','context-browser.json']),
'HUM01':('passed','真实IG/TikTok请求→认领noVNC→明确未登录跳过→后台终态；未知保留，没有每人重复催同一挑战。实际公开主页/照片及复核成功另有证据；真实登录/OTP成功需人工验证。',['live-progress.json','phase-b-real-required.json','instagram-reverify-wait.json','remaining-validation.md']),
'PERSIST01':('passed','实际最终重启保留登录、15终态任务、38结果/标签/版本和10条最终报告；模型/Wave0重放、0pending、无人工租约。受控三个桌面重启通过。',['restart-final-ui.json','live-final.json','acceptance']),
'DOC04':('failed','5类真实文档专项67检查62通过5失败。实际HTML及14列CSV有逐人条件/说明/标签/证据，零合格和无候选正确；正向合格人数标记、跨组归属与人数单位、Campaign总匹配说明不足F30–F32。',['structured-document-validation.md','structured-document-ui.json','doc04-campaign-children-ui.json','findings.md'])})
for row in d['cases']:
 if row['id'] not in M:continue
 status,obs,paths=M[row['id']];existing=[x for x in paths if (r/x).exists()]
 if len(existing)!=len(paths):continue
 row.update(status=status,observations=[obs],evidence=existing,updatedAt=now)
d['updatedAt']=now;d['phase']='completed_with_findings';d['counts']={s:sum(x['status']==s for x in d['cases']) for s in sorted(set(x['status'] for x in d['cases']))}
p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
with (r/'execution-history.jsonl').open('a') as f:f.write(json.dumps({'at':now,'counts':d['counts'],'phase':d['phase']},ensure_ascii=False)+'\n')
print(json.dumps(d['counts'],ensure_ascii=False))
