
# WaveSurge API 文档

Instagram 原始搜索、账号详情、帖子与分页，以及调用方筛选、项目、Campaign 和外联 API。

API v1 · 2026-10-10

## 接口约定

1. 所有接口的前缀是 https://wavesurge.ai/api/v1（例如 https://wavesurge.ai/api/v1/auth/me）。
2. 凭据：登录后的会话令牌。用请求头 Cookie: kolagent_token=$WAVESURGE_TOKEN 发送，这一种写法所有用户接口都接受；大部分接口也接受 Authorization: Bearer <token>，但聊天接口（/codex-chat/*）只认 Cookie 写法。
3. 付费动作必须两步确认：先申请报价卡（返回 credits，15 分钟有效），把积分数报给人并拿到明确同意，再确认。
4. 所有价格都以 credits 计；一次付费动作的实际价格以报价卡的 credits 为准，不要自己推算。
5. Instagram 搜索、账号详情、帖子列表和帖子详情同步返回原始结果，由调用方去重、筛选和分析。
6. 耗时任务全部异步：拿到 id 后用 GET 轮询或订阅 SSE。GET 只读，不会推动任务。
7. 每个会写入的 POST 都由调用方生成幂等键（commandId 用 UUID，requestId 用任意稳定字符串）；重试时沿用同一个值。
8. 外联会真实发送给创作者，涉及真钱的接口（资金、放款）只读不执行。

## 鉴权：拿到令牌

1. 用浏览器登录 https://wavesurge.ai。
2. 打开开发者工具 → Application（应用）→ Cookies → wavesurge.ai，复制 kolagent_token 的值。
3. 把它设成环境变量 WAVESURGE_TOKEN，交给你的 Agent。令牌默认 30 天有效，等同于你的登录身份，不要发到聊天、日志或代码仓库里；退出登录后重新复制。

自检：确认令牌有效：

```bash
export WAVESURGE_TOKEN='<kolagent_token 的值>'
curl -s https://wavesurge.ai/api/v1/auth/me -H "Cookie: kolagent_token=$WAVESURGE_TOKEN"
# => {"user":{"id":"...","email":"...","name":"...","role":"user"}}
```

响应：GET /auth/me：

```json
{
  "user": {
    "id": "4c865faf-0000-4000-8000-000000000007",
    "email": "you@example.com",
    "name": "Your Name",
    "avatarUrl": "https://…",
    "role": "user"
  }
}
```

| 返回 | 含义 |
| --- | --- |
| 401 Authentication required / Invalid token | 令牌缺失、过期或复制不完整，重新登录后再复制 |
| 401 A signed-in browser session is required. | 聊天接口没收到 Cookie 写法的令牌 |
| 403 | 已登录，但不是这个项目 / Campaign 的成员 |

## 通用约定：错误、幂等、分页

- Instagram 原始搜索保留各版本原始响应及上游错误正文，适用其独立响应、错误和分页约定。下列通用格式适用于业务接口。
- 业务错误：{ "error": "<可读句子>", "category": "user|transient|env|internal", "code": "<稳定机器码>" }。category=user 改输入或补条件；transient 可以退避后重试；其他交给人。判断分支读 code，不要读 error 句子。
- 付款相关接口使用信封：成功 { data, asOf, ... }，失败 { error: { code, retryable, userAction, copy } }。
- 请求体一律 application/json，上限 10 MB；很多接口拒绝多余字段（400）。
- 分页各接口自定：积分流水用 limit + cursor，返回 nextCursor；创作者池用 limit；Campaign 列表用 page / limit。

| 状态码 | 含义 | 怎么做 |
| --- | --- | --- |
| 400 | 输入非法 | 按 code 修正输入 |
| 401 | 未登录或令牌无效 | 重新取令牌；聊天接口要用 Cookie 写法 |
| 402 | 积分不足 | 不要重试；读 GET /credits/pending-work，告诉人缺多少 |
| 403 | 无权限 | 请项目 Owner 邀请你为 Manager |
| 404 | 不存在，或不属于你 | 确认 id 和账号 |
| 409 | 状态冲突、需要确认、幂等键冲突 | 先重新读当前状态，再决定下一步；不要换幂等键硬冲 |
| 412 | 缺前置条件（如没有可联系的创作者） | 告诉人缺什么；这类检查都在扣费之前 |
| 429 | 限流 | 退避后重试 |

错误示例：404（业务错误的通用格式）：

```json
{
  "error": "No crawl request with that id.",
  "category": "user",
  "code": "crawl_request_not_found"
}
```

错误示例：402 积分不足：

```json
{
  "error": "insufficient_credits",
  "balance": 120,
  "required": 312,
  "actionLabel": "Reserve creator search credits"
}
```

错误示例：409 报价卡作废：

```json
{
  "error": "This action is not available yet. Review the current task or requirements.",
  "category": "user",
  "code": "codex_confirmation_invalid"
}
```

## Instagram 原始用户搜索 API

### 概述

根据关键词搜索 Instagram 用户并同步返回原始结果。接口不执行画像核验、条件筛选或名单交付；调用方负责去重、筛选及核验。返回 HTTP 状态码、响应正文与 Content-Type，不添加响应包装。搜索结果本身不证明账号满足粉丝数、地区、品类、联系方式等条件。

| 环境 | Base URL |
| --- | --- |
| 生产 | https://wavesurge.ai |
| 测试 | https://test.wavesurge.ai |

所有接口使用 `GET` 方法。查询参数使用 UTF-8 URL 编码，单个参数只能传入一个字符串值。

### 鉴权

所有已登录用户均可调用。支持以下任一方式：

| 方式 | 请求头 |
| --- | --- |
| Bearer JWT | Authorization: Bearer <登录 JWT> |
| 登录 Cookie | Cookie: kolagent_token=<登录 JWT> |

仅需提供 WaveSurge 登录会话凭证。

### 接口列表

| 接口 | 路径 | 搜索参数 | 用户列表位置 | 分页参数 |
| --- | --- | --- | --- | --- |
| V1 | /api/v1/instagram/v1/fetch_search | query | data.users[].user | 无 |
| V2 | /api/v1/instagram/v2/search_users | keyword | data.data.items[] | 无 |
| V3 | /api/v1/instagram/v3/search_users | query | data.users[] | rank_token |

以下响应示例仅展示主要字段。实际响应包含上游返回的完整字段；结果数量及可选字段随搜索结果变化。

### V1 用户搜索

`GET /api/v1/instagram/v1/fetch_search`

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| query | query | string | 是 | 搜索关键词，例如 instagram |
| select | query | string | 否 | 搜索类型。用户搜索传入 users；还支持 hashtags、places。省略时返回全部类型 |

### 请求示例

请求示例：

```bash
curl --get 'https://wavesurge.ai/api/v1/instagram/v1/fetch_search' \
  --header "Cookie: kolagent_token=$WAVESURGE_TOKEN" \
  --data-urlencode 'query=instagram' \
  --data-urlencode 'select=users'
```

### 响应示例

响应示例：

```json
{
  "code": 200,
  "data": {
    "status": "ok",
    "users": [
      {
        "position": 0,
        "user": {
          "username": "instagram",
          "full_name": "Instagram",
          "pk": "25025320",
          "id": "25025320",
          "is_verified": true
        }
      }
    ]
  }
}
```

用户对象位于 `data.users[].user`。本接口无分页参数。

### V2 用户搜索

`GET /api/v1/instagram/v2/search_users`

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| keyword | query | string | 是 | 搜索关键词，例如 instagram |

### 请求示例

请求示例：

```bash
curl --get 'https://wavesurge.ai/api/v1/instagram/v2/search_users' \
  --header "Cookie: kolagent_token=$WAVESURGE_TOKEN" \
  --data-urlencode 'keyword=instagram'
```

### 响应示例

响应示例：

```json
{
  "code": 200,
  "data": {
    "data": {
      "count": 1,
      "items": [
        {
          "username": "instagram",
          "full_name": "Instagram",
          "id": "25025320",
          "is_verified": true,
          "is_private": false
        }
      ]
    }
  }
}
```

用户对象位于 `data.data.items[]`，`data.data.count` 为返回数量。本接口无分页参数。

### V3 用户搜索

`GET /api/v1/instagram/v3/search_users`

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| query | query | string | 是 | 搜索关键词，例如 instagram |
| rank_token | query | string | 否 | 上一次响应返回的非空 token；首次请求省略 |

### 请求示例

请求示例：

```bash
curl --get 'https://wavesurge.ai/api/v1/instagram/v3/search_users' \
  --header "Cookie: kolagent_token=$WAVESURGE_TOKEN" \
  --data-urlencode 'query=instagram'
```

### 响应示例

响应示例：

```json
{
  "code": 200,
  "data": {
    "count": 1,
    "rank_token": null,
    "users": [
      {
        "username": "instagram",
        "full_name": "Instagram",
        "pk": "25025320",
        "id": "25025320",
        "is_verified": true,
        "is_private": false
      }
    ]
  }
}
```

用户对象位于 `data.users[]`。响应可能同时包含相同列表的 `data.items`，应选择其中一个列表使用，避免重复计数。

### 分页规则

`rank_token` 原样转发至上游。仅在响应返回非空 `data.rank_token` 时，使用相同 `query` 和该 token 发起后续请求。token 为 `null`、空字符串或不存在时，无可用分页 token。接口不提供 `page`、`page_size` 或 `offset` 参数。

分页规则：

```bash
export RANK_TOKEN='<上一响应 data.rank_token 返回的非空值>'
curl --get 'https://wavesurge.ai/api/v1/instagram/v3/search_users' \
  --header "Cookie: kolagent_token=$WAVESURGE_TOKEN" \
  --data-urlencode 'query=instagram' \
  --data-urlencode "rank_token=$RANK_TOKEN"
```

分页 token 的可用性取决于响应结果；不保证所有关键词均可连续分页。

### 响应字段

### 通用字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | integer | 业务状态码 |
| data | object | 搜索结果；嵌套结构参见各版本响应示例 |
| request_id | string | 上游请求标识，仅在上游返回时存在 |

### 用户字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| username | string | Instagram 用户名 |
| full_name | string | 用户显示名称 |
| id | string | 用户 ID，应以字符串保存 |
| pk | string | 用户主键，部分版本返回 |
| is_verified | boolean | 是否为认证账号 |
| is_private | boolean | 是否为私密账号，部分版本返回 |
| profile_pic_url | string | 头像 URL，可能具有有效期 |

以上为常见字段，不是固定字段白名单。上游增加、缺省或改变可选字段时，接口保留原始响应。

### 错误响应

| HTTP 状态码 | 来源 | 说明 |
| --- | --- | --- |
| 400 | 本接口 | 查询参数重复，或传入数组、对象 |
| 401 | 本接口 | 登录凭证缺失、无效或对应用户不存在 |
| 502 | 本接口 | 无法取得上游响应 |
| 503 | 本接口 | 上游服务凭证未配置 |
| 504 | 本接口 | 上游请求超时 |
| 其他上游状态码 | 上游服务 | 保留上游状态码及错误正文，例如参数错误、限流或服务异常 |

上游也可能返回表中相同状态码，具体原因以响应正文为准。错误正文可能不是 JSON，客户端应根据 `Content-Type` 处理。

错误响应：

```json
{
  "error": "Authentication required"
}
```

### 调用约定

- 每次调用最多发送一次上游 HTTP 请求，不自动重试或切换接口版本。
- 单次上游请求超时时间为 60 秒；限速排队时间另计。
- 响应不缓存。若上游正文包含反射的服务端凭证，该凭证替换为 `[redacted]`。

## Instagram 账号详情

`GET /api/v1/instagram/v1/fetch_user_info_by_username_v2`

根据 Instagram 用户名获取账号原始详情。所有登录用户均可调用，鉴权方式与搜索接口相同。无需传入项目或 Campaign。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| username | query | string | 是 | Instagram 用户名，不含 @，例如 natgeo |

### 请求示例

请求示例：

```bash
curl --get 'https://wavesurge.ai/api/v1/instagram/v1/fetch_user_info_by_username_v2' \
  --header "Cookie: kolagent_token=$WAVESURGE_TOKEN" \
  --data-urlencode 'username=natgeo'
```

### 响应示例

以下示例仅展示主要字段；接口返回原始响应的完整字段。

响应示例：

```json
{
  "code": 200,
  "data": {
    "id": "787132",
    "username": "natgeo",
    "full_name": "National Geographic",
    "biography": "Example biography",
    "edge_followed_by": { "count": 268409149 },
    "profile_pic_url": "https://images.example/avatar.jpg",
    "profile_pic_url_hd": "https://images.example/avatar-hd.jpg",
    "is_private": false,
    "is_verified": true
  }
}
```

### 字段映射

| 使用目的 | 原始字段 | 说明 |
| --- | --- | --- |
| 用户 ID | data.id | 后续帖子请求的 user_id，保留为字符串 |
| 简介 | data.biography | 账号公开简介；空字符串表示本次响应未提供简介文字 |
| 粉丝数 | data.edge_followed_by.count | 本次查询返回的粉丝数 |
| 头像 | data.profile_pic_url、data.profile_pic_url_hd | 普通或高清头像 URL，字段可能缺省 |

该接口无分页参数。

## Instagram 近期帖子列表

`GET /api/v1/instagram/v1/fetch_user_posts`

根据用户 ID 获取账号帖子列表。首次请求省略 `max_id`，后续请求使用响应返回的 `data.next_max_id`。接口原样返回帖子、图片资源和互动数据，不生成 `photo_urls`、互动率或内容标签。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| user_id | query | string | 是 | 账号详情返回的 data.id |
| count | query | integer | 否 | 每页数量，范围 1–50，默认 12；URL 中以字符串发送 |
| max_id | query | string | 否 | 上一页返回的非空 data.next_max_id；首次请求省略 |

### 首次请求

首次请求：

```bash
curl --get 'https://wavesurge.ai/api/v1/instagram/v1/fetch_user_posts' \
  --header "Cookie: kolagent_token=$WAVESURGE_TOKEN" \
  --data-urlencode 'user_id=787132' \
  --data-urlencode 'count=12'
```

### 响应示例

响应示例：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "4000000000000000001_787132",
        "media_type": 1,
        "taken_at": 1791504000,
        "caption": { "text": "Example caption" },
        "image_versions2": {
          "candidates": [
            { "width": 1080, "height": 1350, "url": "https://images.example/photo.jpg" }
          ]
        },
        "like_count": 1200,
        "comment_count": 30
      }
    ],
    "more_available": true,
    "next_max_id": "opaque-cursor"
  }
}
```

### 帖子字段

| 原始字段 | 类型 | 说明 |
| --- | --- | --- |
| data.items[] | array | 本页帖子列表 |
| data.items[].id | string | 帖子 ID，保留原始值；优先使用字符串 ID 去重 |
| data.items[].media_type | integer | 1 为照片，2 为视频，8 为轮播 |
| data.items[].caption.text | string | 帖子文字，可缺省或为 null |
| data.items[].taken_at | integer | 发布时间，Unix 秒 |
| data.items[].image_versions2.candidates[] | array | 图片资源的不同尺寸版本；视频帖通常为封面 |
| data.items[].carousel_media[] | array | 轮播内的照片或视频，分别查看其 media_type 和图片资源 |
| data.items[].like_count | integer | 点赞数，可能受账号或帖子设置影响 |
| data.items[].comment_count | integer | 评论数，可能受账号或帖子设置影响 |
| data.more_available | boolean | 是否有后续页 |
| data.next_max_id | string/null | 下一页游标，原样传入 max_id |

同一图片的 `candidates` 是不同分辨率，不应当成多张照片。照片帖选择一个合适尺寸的 URL；轮播帖逐项选择。视频封面应单独标识，不当作照片帖子。图片和头像 URL 可能有有效期。

原始响应可能包含超出 JavaScript 安全整数范围的数值 ID。优先使用字符串 `id`；需要读取数值 ID 时使用无损 JSON 解析，避免精度丢失。

### 翻页请求

翻页请求：

```bash
export NEXT_MAX_ID='<上一响应 data.next_max_id 返回的非空值>'
curl --get 'https://wavesurge.ai/api/v1/instagram/v1/fetch_user_posts' \
  --header "Cookie: kolagent_token=$WAVESURGE_TOKEN" \
  --data-urlencode 'user_id=787132' \
  --data-urlencode 'count=12' \
  --data-urlencode "max_id=$NEXT_MAX_ID"
```

仅当 `data.more_available` 为 true 且 `data.next_max_id` 非空时继续请求。保持 `user_id` 不变；无后续页或无有效游标时停止。按帖子字符串 ID 去重，置顶内容等可能影响返回顺序；分页可用性及历史范围以实际响应为准。

### 调用方计算与分析

- `engagement_rate`：使用近期 N 条帖子的平均（点赞数＋评论数）除以粉丝数；展示百分比时乘以 100%，并记录样本数 N。计数缺失、不可见或无有效粉丝数时标记为未知。
- `content_tags`：由调用方根据简介、帖子文字和图片进行 AI 分类；账号自填类别不等于 AI 内容标签。
- `photo_urls`：由调用方从照片帖或轮播照片的图片资源中提取，接口不添加该字段。

两个接口使用搜索接口相同的错误与透传约定：保留上游状态码、响应正文与 Content-Type；不缓存，不自动重试，不自动筛选或补充字段。缺失参数及非法 `count` 的上游错误原样返回；私密或不可用账号可能返回错误、空列表或缺省字段，应以响应为准。

## Instagram 帖子详情

`GET /api/v1/instagram/v2/fetch_post_info`

通过 Instagram 帖子短码或完整链接获取单条帖子原始详情。所有登录用户均可调用，使用 Cookie 或 Bearer JWT 鉴权。请求不写入业务数据库。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| code_or_url | query | string | 是 | 帖子短码或完整链接，例如 DeR4RetDg3c 或 https://www.instagram.com/p/DeR4RetDg3c/ |

### 请求示例

短码查询：

```bash
curl --get 'https://wavesurge.ai/api/v1/instagram/v2/fetch_post_info' \
  --header "Authorization: Bearer $WAVESURGE_JWT" \
  --data-urlencode 'code_or_url=DeR4RetDg3c'
```

完整链接查询：

```bash
curl --get 'https://wavesurge.ai/api/v1/instagram/v2/fetch_post_info' \
  --header "Authorization: Bearer $WAVESURGE_JWT" \
  --data-urlencode 'code_or_url=https://www.instagram.com/p/DeR4RetDg3c/'
```

### 响应示例

以下为主要字段示例；响应完整字段原样返回。实际内容和计数以本次响应为准。

响应示例：

```json
{
  "code": 200,
  "data": {
    "data": {
      "id": "3680000000000000000_787132",
      "code": "DeR4RetDg3c",
      "media_type": 8,
      "caption": {
        "text": "Example caption"
      },
      "user": {
        "id": "787132",
        "username": "natgeo"
      },
      "metrics": {
        "like_count": 153277,
        "comment_count": 351,
        "view_count": null
      },
      "image_versions": {
        "items": [
          {
            "url": "https://images.example/cover.jpg",
            "width": 1080,
            "height": 1350
          }
        ]
      },
      "carousel_media": [
        {
          "media_type": 1,
          "image_versions": {
            "items": [
              {
                "url": "https://images.example/photo.jpg",
                "width": 1080,
                "height": 1350
              }
            ]
          }
        },
        {
          "media_type": 2,
          "thumbnail_url": "https://images.example/video-cover.jpg",
          "video_url": "https://videos.example/video.mp4"
        }
      ]
    }
  }
}
```

### 响应字段

| 内容 | 字段路径 | 说明 |
| --- | --- | --- |
| 帖子 ID / 短码 | data.data.id、data.data.code | ID 保留为字符串；列表项 code 可作为 code_or_url |
| 正文 | data.data.caption.text | 可能为空或缺省 |
| 发布者 | data.data.user | 包含 username、id 等原始字段 |
| 点赞数 / 评论数 | data.data.metrics.like_count、data.data.metrics.comment_count | 数字表示返回计数；null 或缺省表示未提供，不能按 0 处理 |
| 图片资源 | data.data.image_versions.items[].url | 照片图片或视频封面，按 media_type 判断 |
| 轮播资源 | data.data.carousel_media[] | 照片使用 image_versions.items[].url；视频使用 video_url / video_versions[].url |
| 缩略图 / 视频 | data.data.thumbnail_url、data.data.video_url | 字段随媒体类型变化，可能缺省 |

单条详情无分页参数。近期帖子翻页使用 fetch_user_posts 的 max_id；本接口返回评论计数，不提供完整评论列表。媒体类型通常为 1（照片）、2（视频）、8（轮播）。视频封面不能作为照片帖处理。媒体 URL 可能失效，应以最新响应为准。

保留原始 HTTP 状态码、正文和 Content-Type；不缓存、不自动重试、不自动筛选或计算互动率。未登录返回 401。缺失或无效 code_or_url、帖子不可用等错误按原始响应返回。

## 工作流一：项目与聊天（推荐主入口）

建项目、写需求、出报告、找人，都从这里走。

1. 建项目：POST /codex-chat/conversations，body { title? }，返回 201 { id, title, updatedAt }，id 就是 projectId。
2. 发消息：POST /codex-chat/conversations/:projectId/turns，body { commandId: <uuid>, text }，返回 202 { turnId }，回复在后台生成；同一项目已有回复在生成时返回 409 chat_turn_active，等它结束再发。
3. 读结果：GET /codex-chat/conversations/:projectId 返回快照 { messages, brief, actionReadiness, tasks, outputs, confirmation, activeTurn, pendingUserInput, campaignId }。activeTurn 为 null 表示回复已完成。也可以订阅 SSE：GET …/events（type 为 snapshot / text_delta / tool / turn_completed），以 turn_completed 之后的快照为准。
4. 回答选择题：快照里有 pendingUserInput 时，POST …/user-input，body { itemId, answers: { <questionId>: ["选项"] } }。
5. 启动付费工作：确认 actionReadiness.<action>.canRequestConfirmation 为 true；POST …/confirmations，body { action: "creator_search" | "strategy_report" | "competitor_report" }，拿到报价卡 { id, credits, payerName, expiresAt, summary }；把 credits 告诉人，得到明确同意后，POST …/confirmations/:confirmationId/confirm。
6. 报价卡作废（需求或价格变了、过期）时 confirm 返回 409 codex_confirmation_invalid，重新申请一张即可；重复确认不会重复下单。
7. 跟踪进度：快照里的 tasks[]（status 为 working / needs_you / done，带 deliveredCount、targetCount）和 outputs[]（Campaign、创作者名单等链接）。
8. 停止当前回复：POST …/interrupt，body { turnId }；不会取消已确认的付费任务。

建项目 → 发需求 → 读快照：

```bash
BASE=https://wavesurge.ai/api/v1
H="Cookie: kolagent_token=$WAVESURGE_TOKEN"

curl -s -X POST $BASE/codex-chat/conversations -H "$H" \
  -H 'Content-Type: application/json' -d '{"title":"Acme US launch"}'
# => {"id":"<projectId>", ...}

curl -s -X POST $BASE/codex-chat/conversations/<projectId>/turns -H "$H" \
  -H 'Content-Type: application/json' \
  -d '{"commandId":"'$(uuidgen)'","text":"官网 https://acme.com，美国市场，预算 5000 美元，找 30 个 TikTok 美妆创作者，粉丝 1万-10万"}'
# => 202 {"turnId":"..."}

curl -s $BASE/codex-chat/conversations/<projectId> -H "$H"
```

两步确认（以找创作者为例）：

```bash
curl -s -X POST $BASE/codex-chat/conversations/<projectId>/confirmations -H "$H" \
  -H 'Content-Type: application/json' -d '{"action":"creator_search"}'
# => {"id":"<confirmationId>","credits":<n>,"payerName":"...","expiresAt":"..."}
# —— 把 credits 和 payerName 告诉人，拿到明确同意 ——
curl -s -X POST $BASE/codex-chat/conversations/<projectId>/confirmations/<confirmationId>/confirm -H "$H"
# => {"ok":true}
```

### 请求与响应样例

请求：POST /codex-chat/conversations：

```json
{
  "title": "Glowkit US launch"
}
```

响应：201：

```json
{
  "id": "9b1d2c3e-0000-4000-8000-000000000001",
  "title": "Glowkit US launch",
  "updatedAt": "2026-10-09T09:17:40.112Z"
}
```

请求：POST /codex-chat/conversations/:projectId/turns：

```json
{
  "commandId": "5f0e6a8b-0000-4000-8000-000000000008",
  "text": "官网 https://glowkit.co，美国市场，总预算 15000 美元，找 10 个护肤博主，TikTok 和 Instagram 各 5 个，粉丝 1万-10万，必须能联系"
}
```

响应：202：

```json
{
  "turnId": "0f8cd46b-0000-4000-8000-000000000003"
}
```

响应：GET /codex-chat/conversations/:projectId（节选）：

```json
{
  "id": "9b1d2c3e-0000-4000-8000-000000000001",
  "title": "Glowkit",
  "campaignId": "6c2e4a10-0000-4000-8000-000000000002",
  "messages": [
    {
      "id": "0f8cd46b-0000-4000-8000-000000000003:user",
      "role": "user",
      "text": "你还可以做什么？",
      "createdAt": "2026-10-07T09:17:52.892Z"
    },
    {
      "id": "0f8cd46b-0000-4000-8000-000000000003:assistant",
      "role": "assistant",
      "text": "我可以继续帮你：查看已交付的 10 位创作者、生成策略报告、生成竞品报告、完善合作规则……",
      "createdAt": "2026-10-07T09:18:09.976Z"
    }
  ],
  "permissions": {
    "view": true,
    "manage": true,
    "owner": true,
    "canChat": true,
    "canSaveBrief": true,
    "canRunPaidOperation": true
  },
  "briefRevision": 3,
  "brief": {
    "website": "https://glowkit.co",
    "regions": [
      "United States"
    ],
    "budgetUsd": 15000,
    "platforms": [
      "tiktok",
      "instagram"
    ],
    "creatorSearch": {
      "count": 10,
      "persona": "护肤博主",
      "minFollowers": 10000,
      "maxFollowers": 100000,
      "platformCounts": {
        "tiktok": 5,
        "instagram": 5
      },
      "contactRequired": true
    }
  },
  "actionReadiness": {
    "creator_search": {
      "state": "ready",
      "canRequestConfirmation": true,
      "missingCount": 0
    },
    "strategy_report": {
      "state": "ready",
      "canRequestConfirmation": true,
      "missingCount": 0
    },
    "competitor_report": {
      "state": "needs_input",
      "canRequestConfirmation": false,
      "missingCount": 1
    }
  },
  "tasks": [
    {
      "id": "abbde687-0000-4000-8000-000000000006",
      "kind": "creator_search",
      "createdAt": "2026-09-22T16:51:51.156Z",
      "title": "Finding creators",
      "status": "done",
      "isActive": false,
      "deliveredCount": 10,
      "targetCount": 10,
      "nextActions": [
        "view_result",
        "continue_chat"
      ]
    }
  ],
  "outputs": [
    {
      "id": "6c2e4a10-0000-4000-8000-000000000002",
      "title": "Continue collaboration",
      "url": "/app/campaigns?campaignId=6c2e4a10-0000-4000-8000-000000000002",
      "kind": "campaign"
    },
    {
      "id": "6c2e4a10-0000-4000-8000-000000000002:creators",
      "title": "View creators",
      "url": "/app/discover?campaignId=6c2e4a10-0000-4000-8000-000000000002",
      "kind": "creators"
    }
  ],
  "confirmation": null,
  "activeTurn": null,
  "pendingUserInput": null
}
```

快照里的 pendingUserInput（需要回答选择题时）：

```json
{
  "turnId": "0f8cd46b-0000-4000-8000-000000000003",
  "itemId": "item_7",
  "askedAt": "2026-10-09T09:20:11.000Z",
  "questions": [
    {
      "id": "budget_scope",
      "header": "预算",
      "question": "15000 美元是创作者费用，还是整体营销预算？",
      "isOther": true,
      "isSecret": false,
      "options": [
        {
          "label": "只算创作者费用",
          "description": "平台服务费另算"
        },
        {
          "label": "整体营销预算",
          "description": "包含创作者费用和服务费"
        }
      ]
    }
  ]
}
```

请求：POST /codex-chat/conversations/:projectId/user-input：

```json
{
  "itemId": "item_7",
  "answers": {
    "budget_scope": [
      "整体营销预算"
    ]
  }
}
```

请求：POST /codex-chat/conversations/:projectId/confirmations：

```json
{
  "action": "creator_search"
}
```

响应：报价卡：

```json
{
  "id": "c0ffee00-0000-4000-8000-000000000004",
  "action": "creator_search",
  "title": "Find creators",
  "payerName": "Your Name",
  "credits": 312,
  "briefVersion": 4,
  "expiresAt": "2026-10-09T09:35:00.000Z",
  "summary": [
    "咖啡测评和手冲教程类创作者",
    "Creator location: United States",
    "tiktok: 7 creators",
    "instagram: 3 creators",
    "Total: 10 creators",
    "20K+ followers",
    "under 150K followers",
    "must be contactable",
    "posts in English"
  ]
}
```

响应：POST …/confirmations/:confirmationId/confirm：

```json
{
  "ok": true
}
```

### 附件

1. POST /codex-chat/conversations/:projectId/attachments，body { filename, sizeBytes }，返回 { id, uploadUrl, expiresAt }（单个文件 ≤ 100 MB）。
2. PUT <uploadUrl> 上传文件原始字节，Content-Type 与文件扩展名一致。
3. POST …/attachments/:attachmentId/commit。
4. 发消息时带上 attachmentIds: [<id>]，一条消息最多 5 个。

### 项目读取接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /codex-chat/conversations | 最近的项目会话 |
| GET | /strategy-projects/:projectId/brief | 当前 Brief、字段状态、版本、找人目标 |
| PATCH | /strategy-projects/:projectId/brief | body { commandId, expectedBriefRevision, patch } 直接写 Brief（免费） |
| GET | /strategy-projects/:projectId/campaign/current | 当前 Campaign |
| GET | /strategy-projects/:projectId/reports | 报告列表；/reports/:operationId/result 读单份 |
| GET | /strategy-projects/:projectId/creator-search/current | 找人当前状态：各平台目标、已交付、缺口 |
| GET | /strategy-projects/:projectId/creator-search/requests/:taskId/results | 一次搜索的结果 |
| GET | /strategy-agent/deck.html?kind=brand\|competitor&artifactId= | 报告的可下载网页文件 |

响应：GET /strategy-projects/:projectId/brief（节选）：

```json
{
  "project": {
    "id": "9b1d2c3e-0000-4000-8000-000000000001",
    "title": "Glowkit",
    "campaignId": "6c2e4a10-0000-4000-8000-000000000002",
    "updatedAt": "2026-10-09T13:59:15.678Z"
  },
  "brief": {
    "website": "https://glowkit.co",
    "regions": [
      "United States"
    ],
    "budgetUsd": 15000,
    "platforms": [
      "tiktok",
      "instagram"
    ],
    "creatorSearch": {
      "count": 10,
      "persona": "护肤博主",
      "minFollowers": 10000,
      "maxFollowers": 100000,
      "platformCounts": {
        "tiktok": 5,
        "instagram": 5
      },
      "contactRequired": true
    }
  },
  "briefVersion": 3,
  "briefRevision": 3,
  "creatorSearch": {
    "status": "done",
    "summary": "10 creators delivered",
    "requested": 10,
    "delivered": 10,
    "operationId": "abbde687-0000-4000-8000-000000000006",
    "operationState": "succeeded",
    "taskId": "aaf279f0-0000-4000-8000-000000000005",
    "failure": null,
    "updatedAt": "2026-10-09T13:59:15.678Z"
  },
  "asOf": "2026-10-09T14:14:06.689Z"
}
```

响应：GET /strategy-projects/:projectId/creator-search/current（节选）：

```json
{
  "state": "ready_to_confirm",
  "asOf": "2026-10-09T14:14:06.689Z",
  "briefVersion": 3,
  "briefRevision": 3,
  "criteria": {
    "count": 10,
    "persona": "护肤博主",
    "minFollowers": 10000,
    "maxFollowers": 100000,
    "platformCounts": {
      "tiktok": 5,
      "instagram": 5
    },
    "contactRequired": true,
    "creatorLocations": [
      "United States"
    ],
    "platforms": [
      "tiktok",
      "instagram"
    ]
  },
  "missing": []
}
```

## 工作流二：创作者名单与 Campaign

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /discover/db?platform=tiktok,instagram&campaignId=&limit=&sort= | 读 Campaign 的创作者名单。platform 必填（tiktok / instagram / youtube / twitter，可逗号分隔）；sort 为 fit_desc / followers_desc / followers_asc；每位创作者带 audience（粉丝画像） |
| POST | /discover/confirm-removal | 从名单剔除创作者，免费 |
| POST | /creator-list/parse → /creator-list/commit | 上传你自己的创作者名单（CSV / Excel），免费 |
| GET | /kol/campaigns | Campaign 列表；GET /kol/campaigns/:id 读详情 |
| GET | /kol/campaigns/:id/kols | Campaign 名单（含外联状态） |
| GET | /kol/campaigns/:campaignId/outreach-progress | 已回复 / 未回复 |
| GET | /kol/campaigns/:campaignId/send-progress | 发送进度 |

响应：GET /discover/db?platform=tiktok,instagram&campaignId=…（节选，creators 只列一位）：

```json
{
  "summary": {
    "total": 10,
    "byPlatform": {
      "tiktok": 5,
      "instagram": 5
    },
    "emailUsable": 10,
    "emailQualified": 10,
    "emailAutoSendable": 10,
    "contactable": 10,
    "nonEmailContactable": 6
  },
  "target": 15,
  "fulfilled": 10,
  "latestCreatorSearchTaskId": "aaf279f0-0000-4000-8000-000000000005",
  "creators": [
    {
      "id": "db83ae10-0000-4000-8000-000000000009",
      "platform": "tiktok",
      "handle": "example_creator",
      "displayName": "Example Creator",
      "region": "United States",
      "followerCount": 21897,
      "engagementRate": null,
      "tier": "micro",
      "origin": "system",
      "foundAt": "2026-09-22T17:17:24.288Z",
      "emailStatus": "email_ready",
      "email": null,
      "emailUsable": true,
      "emailOwnerType": "creator",
      "contactable": true,
      "contactChannels": [],
      "searchKind": "committed",
      "recommendationKind": "delivered",
      "searchMatchTier": "precise",
      "audienceStatus": "profiled",
      "audience": {
        "availability": "available",
        "basis": "Sampled 25 of their most recent followers.",
        "capturedAt": "2026-09-22T17:06:09.378Z",
        "rows": [
          {
            "key": "gender",
            "label": "Gender",
            "value": "Female 64% · Male 4% · Unknown 32%",
            "hint": "Estimated from 25 accounts."
          },
          {
            "key": "age",
            "label": "Age",
            "value": "19-29 28% · 30-39 16% · >=40 4% · +1 more · Unknown 52%",
            "hint": "Estimated from 25 accounts."
          }
        ]
      }
    }
  ]
}
```

## 工作流三：外联（会真实发送）

> **这些接口会真实联系创作者并扣费**：调用前先把人数、费用和发送内容告诉人，拿到明确同意。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /discover/start-outreach | body { campaignId }，开始外联，按可联系人数 × 6 credits 扣费。409 outreach_already_started 表示已开始过；412 no_send_channel 表示没人可联系（不扣费）；402 积分不足 |
| POST | /kol/campaigns/:campaignId/pause | 暂停全部发送 |
| POST | /kol/campaigns/:campaignId/resume | 恢复暂停时取消的那些发送 |
| POST | /kol/campaign-kols/:id/send-message | 给某位创作者发一条消息 |

## 积分与价格

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /credits/balance | { balance } |
| GET | /credits/ledger?limit=&cursor= | 积分流水，返回 nextCursor |
| GET | /credits/pending-work | 因积分不足而等待的付费工作和缺口 |
| GET | /pricing | 公开价目表，不需要登录 |

响应：GET /credits/balance：

```json
{
  "balance": 2058
}
```

响应：GET /credits/ledger?limit=1：

```json
{
  "entries": [
    {
      "id": "4960641a-0000-4000-8000-00000000000a",
      "action": "strategy_operation_refund",
      "cost": 148,
      "balanceAfter": 2058,
      "refId": "abbde687-0000-4000-8000-000000000006",
      "refType": "StrategyOperation",
      "createdAt": "2026-09-22T17:17:24.369Z",
      "ref": {
        "name": "Creator search"
      },
      "actor": null
    }
  ],
  "nextCursor": "MjAyNi0wOS0yMlQxNzoxNzoyNC4zNTcwMDBafDE4N2Ex…"
}
```

响应：GET /credits/pending-work：

```json
{
  "items": [],
  "totalCredits": 0,
  "balance": 2058,
  "shortfall": 0,
  "held": [],
  "heldCredits": 0
}
```

| 动作 | 价格（credits） |
| --- | --- |
| 策略报告 | 40 / 份 |
| 竞品报告 | 100 / 份 |
| 找创作者 | 每位实际交付 10 + 本次真实调用成本，先预留后结算 |
| 首次外联 | 6 / 每位可联系的创作者 |
| 跟进消息 / AI 谈判回复 | 1 / 条、1 / 条 |
| 聊天、改需求、建 Campaign、上传、查询、剔除创作者 | 免费 |

购买积分需要人在 Money 页面完成，Agent 不应替用户付款。

## Agent 行为守则

- 任何会扣 credits、联系创作者或动钱的调用，先把报价或影响范围告诉人，拿到明确同意后再执行。
- 需求以平台保存的 Brief 为准：先通过聊天或 PATCH /brief 写进去，再申请报价。
- 遇到 409 先重新读当前状态，再决定下一步；遇到 402 不要重试。
- usage 里的 *CostUsd 是内部成本观测，不要当作价格告诉用户，也不要把 credits 换算成美元。
- 不要把令牌写进日志、URL、聊天记录或代码仓库。