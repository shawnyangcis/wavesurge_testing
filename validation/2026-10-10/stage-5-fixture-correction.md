# 去重夹具修正记录

首轮 seed-campaign.ts 保存草案后调用 start，但未使用其返回的含 childTaskIds 的新对象，因此未给新子任务注入受控候选；生产执行器按 queued 状态实际提交了两项免费搜索。这个失败不是正向去重验收证据。

- research-5b048604116d7fcbdce4e705 → remote 05b79b83-a3c7-4dd1-a90b-81a958601b15
- research-9698a6d1fc749a4a3df6084e → remote d4678638-98d2-4c18-9d2c-3d1c5adf6587

已通过 ResearchEngine.cancel 停止本地执行，远端可能继续，不能声称已远端取消。修正夹具使用 start 返回对象，再独立验证受控重叠候选；最终证据明确区分 WaveSurge 真实发现与受控候选。
