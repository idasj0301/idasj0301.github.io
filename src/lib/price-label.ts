/** 全站统一：有价 ¥149,900 起；无价 价格咨询 */
export function formatPriceLabel(priceFrom: number): string {
  if (priceFrom > 0) {
    return `¥${priceFrom.toLocaleString("zh-CN")} 起`;
  }
  return "价格咨询";
}
