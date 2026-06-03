export const SITE = {
  name: "船客",
  title: "船客 · 极地邮轮与探险旅行",
  description:
    "船客专注南极、北极、加拉帕戈斯及全球轻探险邮轮旅行。25 年极地经验，企业微信直连顾问，提供航程推荐与定制服务。",
  url: "https://www.chuanke.com",
  /** 企业微信获客链接；未配置时使用站内顾问页二维码作为回退 */
  wecomUrl: import.meta.env.PUBLIC_WECOM_URL?.trim() ?? "",
  wecomDefaultFrom: "website",
} as const;
