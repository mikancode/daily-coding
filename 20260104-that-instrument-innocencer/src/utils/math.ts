/**
 * 数値の範囲を変換する汎用的な関数
 * @function mapRange
 * @param  value 変換したい数値
 * @param  inMin 変換前の最小値
 * @param  inMax 変換前の最大値
 * @param  outMin 変換後の最小値
 * @param  outMax 変換後の最大値
 * @returns  変換後の数値
 * @example
 * mapRange(50, 0, 100, 1000, 2000); // 1500 を返す
 * 例えば、0〜windowWidth の値を、minFreq〜maxFreq の範囲に変換する
 */
export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};