# 证据目录

所有文件均对应2026-10-15–16本轮执行。真实产物、受控功能验证和历史反例分别标明来源。凭据、Cookie、完整模型载荷、私有数据库、上下文备份及内嵌trace未发布。

|文件|内容|
|---|---|
|[business-workflows.json](business-workflows.json)|真实自然输入、任务、实际标签/判断、Wave路径、批次最终交付时序|
|[call-audit.json](call-audit.json)、[individual-model-audit.json](individual-model-audit.json)|有界提取的实际调用元数据、逐人请求关联与submit_judgments；不含完整模型输入|
|[structured-validation.json](structured-validation.json)|14组实际JSON/CSV结构、原生类型、引用及分配核对|
|[campaign-final.html](campaign-final.html)、[campaign-final.json](campaign-final.json)、[campaign-final.csv](campaign-final.csv)|实际Campaign总文档和最终去重入选2人|
|[two-groups-combined.json](two-groups-combined.json)、[all-annotation-combined.json](all-annotation-combined.json)|4记录/2账号、来源、分组与补标单位|
|[original-20-final.json](original-20-final.json)、[original-20-final-offline.html](original-20-final-offline.html)|原题9条核验记录、0入选及带截图离线产物|
|[filtered-empty.json](filtered-empty.json)、[filtered-empty.csv](filtered-empty.csv)|过滤空集及全量/导出分开统计|
|[final-docs.json](final-docs.json)、[modal-evidence.json](modal-evidence.json)、[offline-check.json](offline-check.json)|实际下载、结果加载后可见标签、尺寸与无网络离线打开|
|[supplemental-ui.json](supplemental-ui.json)、[compression-boundary.json](compression-boundary.json)|设置/上下文/消息/取消/重启、F33及实际压缩边界|
|[controlled-acceptance.json](controlled-acceptance.json)、[acceptance-final.log](acceptance-final.log)|实际模型/有头浏览器/VNC/三次重启，候选网页与Wave为明确夹具|
|[history-ui.json](history-ui.json)|当前界面对历史F26–F28实际反例回归|
|[automation-summary.json](automation-summary.json)、[browser-popups-final.log](browser-popups-final.log)|完整自动化范围和实际通过计数|
|[version-and-preservation.json](version-and-preservation.json)|本地/运行版本及全部原业务数据哈希保护|
|[campaign-loading.json](campaign-loading.json)、[runtime-observation.json](runtime-observation.json)|列表慢加载及存量诊断异常观察|
|[delivery-message-audit.json](delivery-message-audit.json)|空名单模型答复与自动综合摘要重复的实际消息、ID和时间|
|[artifact-check.json](artifact-check.json)|公开资料链接、凭据扫描、数量及哈希检查结果|

其余以业务场景命名的HTML/CSV/JSON为实际产物。在线HTML的 `/api/` 相对链接须在原应用会话使用；离线版已用无认证、禁止HTTP请求的新浏览器验证截图可显示。
