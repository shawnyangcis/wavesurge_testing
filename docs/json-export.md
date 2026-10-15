# JSON 结果文件

在研究结果面板、在线 HTML 报告和 Campaign 方案中点击「下载 JSON」。新任务结束时，对话交付消息也会附上 JSON 链接。历史报告无需重新运行即可导出。

所有下载均需要已登录的工作室会话，与 HTML、CSV 使用同样权限。

| 地址 | 文件 | 导出范围 |
| --- | --- | --- |
| `/api/reports/:taskId?format=json` | `creators.json` | 研究的全部已保存结果，支持结果页的标签、平台、判断筛选 |
| `/api/campaigns/:id/report?format=json` | `campaign-creators.json` | Campaign 跨组去重、最终分配后的入选名单，与 Campaign CSV 一致 |
| `/api/work-batches/:id/report?format=json` | `creator-batch.json` | 一次请求中各项工作的结果，保留逐条来源与分组 |

文件使用 UTF-8、标准 JSON，无 BOM。`schemaVersion` 当前为 `"1.0"`。数组、数字、布尔值保留原生类型，未知资料使用 `null`，不把未知粉丝数变成 0。时间为 Unix 毫秒；`publishedAt` 保留来源日期字符串或 `null`。外部消费者应忽略将来增加的字段。

| 字段 | 含义 |
| --- | --- |
| `report` | 报告编号、类型（`research` / `campaign` / `work_batch`）、标题、更新时间、目标数量和说明 |
| `scope.filters` | 本次实际应用的筛选条件；`tagMode` 未指定时沿用接口的 `contains` 规则 |
| `scope.selectionOnly` | 是否只导出最终入选者，Campaign 为 `true` |
| `counts.all` | 筛选前全部保存记录的统计，Campaign 包括各组未入选记录 |
| `counts.exported` | 本文件 `results` 数组的统计 |
| `groups` | 每组编号、来源任务、名称、目标名额、入选口径及全量/导出统计 |
| `workItems` | 综合报告中的工作项目、各项目目标及其计数单位；其他报告为空数组 |
| `results` | 创作者结果数组，包含 `verdict`、`selected`、`judgments`、`annotations`、标签、资料和证据 |
| `results[].reportContext` | 来源任务标题、分组归属、Campaign 最终分配及独立研究预选标记 |
| `results[].creator` | 账号、平台、粉丝、地区、已核实事实、互动率与样本、照片链接、证据数组；不导出原始服务商调试载荷 |
| `results[].creator.evidence` | 原文、来源链接、提供方、时间与截图地址。判断中的 `evidenceIds` 对应同一创作者的证据 `id` |
| `campaign` | 仅 Campaign 报告提供目标、受众、版本、状态和每组筛选方案 |

统计中 `records` / `qualified` / `selected` / `unknown` / `rejected` 是记录数，`unique` / `qualifiedUnique` / `selectedUnique` 是按平台账号去重数。同一账号可以在多组出现；合格与入选分别计数。综合报告各工作目标可能使用不同单位，以 `workItems[].unit` 为准，不用综合目标与去重人数直接相减。

`verdict` 取值为 `match`（符合）、`no_match`（不符合）、`unknown`（待核实）。`selected` 是最终入选布尔值；只在符合且实际入选时为 `true`。Campaign 子报告采用与总报告相同的最终分配，`researchSelected` 仅保留原独立研究预选记录。待人工确认项保留在判断和 `reviewNote` 中。

`screenshotUrl` 为工作室根路径，例如 `/api/assets/...`，访问仍需登录；JSON 不内嵌图片。相对地址应相对于工作室域名解析。

Python 读取已下载文件：

```python
import json
with open('creators.json', encoding='utf-8') as file:
    report = json.load(file)
for result in report['results']:
    if result['selected']:
        print(result['creator']['handle'], result['reportContext']['groupTitle'])
```
