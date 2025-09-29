/**
 * KaTeXフォントメトリクス計算ユーティリティ (API互換性向上版)
 * KaTeXの内部データソース(fontMetrics.js, fontMetricsData.js)と互換性のある形式で
 * テキストの幅と高さを計算します。
 */

// KaTeXの内部モード定義に合わせた型
export type Mode = "math" | "text";

/**
 * KaTeX互換の文字メトリクスインターフェース
 * 各値はem単位
 */
export interface CharacterMetrics {
  /** ベースラインからの下降深さ */
  depth: number;
  /** ベースラインからの上昇高さ */
  height: number;
  /** イタリック補正値 */
  italic: number;
  /** スキュー（傾き）値 */
  skew: number;
  /** 文字の幅 */
  width: number;
}

// fontMetricsData.js互換のデータ構造
// [depth, height, italic, skew, width] の配列形式
type FontMetricsData = Record<string, Record<number, [number, number, number, number, number]>>;

// KaTeXのフォントメトリクスデータの遅延読み込み
let cachedMetricMap: FontMetricsData | null = null;

/**
 * KaTeXのフォントメトリクスデータを取得
 */
async function getMetricMap(): Promise<FontMetricsData> {
  if (cachedMetricMap) {
    return cachedMetricMap;
  }

  try {
    // KaTeXのfontMetricsDataを動的にインポート
    const katex = await import('katex');
    if (katex && katex.fontMetricsData) {
      cachedMetricMap = katex.fontMetricsData;
      return cachedMetricMap;
    }
  } catch (error) {
    // KaTeXが利用できない場合のフォールバック
    console.warn('KaTeX font metrics not available, using fallback:', error);
  }

  // フォールバック: 基本的な文字メトリクス
  cachedMetricMap = getFallbackMetrics();
  return cachedMetricMap;
}

/**
 * フォールバック用の基本メトリクス
 */
function getFallbackMetrics(): FontMetricsData {
  // Computer Modern/Latin Modernフォントの近似値
  const basicMetrics: Record<number, [number, number, number, number, number]> = {};
  
  // 数字 0-9
  for (let i = 48; i <= 57; i++) {
    basicMetrics[i] = [0, 0.64, 0, 0, 0.5];
  }
  
  // 大文字 A-Z
  for (let i = 65; i <= 90; i++) {
    const char = String.fromCharCode(i);
    const widths: Record<string, number> = {
      'A': 0.7, 'B': 0.65, 'C': 0.7, 'D': 0.7, 'E': 0.6,
      'F': 0.55, 'G': 0.75, 'H': 0.7, 'I': 0.35, 'J': 0.5,
      'K': 0.7, 'L': 0.55, 'M': 0.85, 'N': 0.7, 'O': 0.75,
      'P': 0.6, 'Q': 0.75, 'R': 0.65, 'S': 0.55, 'T': 0.65,
      'U': 0.7, 'V': 0.7, 'W': 0.95, 'X': 0.7, 'Y': 0.7, 'Z': 0.6
    };
    basicMetrics[i] = [0, 0.68, 0, 0, widths[char] || 0.6];
  }
  
  // 小文字 a-z
  for (let i = 97; i <= 122; i++) {
    const char = String.fromCharCode(i);
    const widths: Record<string, number> = {
      'a': 0.45, 'b': 0.5, 'c': 0.4, 'd': 0.5, 'e': 0.4,
      'f': 0.3, 'g': 0.5, 'h': 0.5, 'i': 0.25, 'j': 0.3,
      'k': 0.45, 'l': 0.25, 'm': 0.75, 'n': 0.5, 'o': 0.5,
      'p': 0.5, 'q': 0.5, 'r': 0.35, 's': 0.4, 't': 0.3,
      'u': 0.5, 'v': 0.45, 'w': 0.65, 'x': 0.45, 'y': 0.45, 'z': 0.4
    };
    const depth = ['g', 'j', 'p', 'q', 'y'].includes(char) ? 0.2 : 0;
    basicMetrics[i] = [depth, 0.44, 0, 0, widths[char] || 0.5];
  }
  
  // スペース
  basicMetrics[32] = [0, 0, 0, 0, 0.25];
  
  return { 'Main-Regular': basicMetrics };
}

/**
 * KaTeXのfontMetricsData.jsから抽出したフォントメトリクスデータ。
 * このマップは `make metrics` スクリプトによって生成されます。手動で変更しないでください。
 */
export function getCharacterMetrics(
    character: string,
    font: string = "Main-Regular",
    mode: Mode = "math",
): CharacterMetrics | undefined {
  const metricMap = getMetricMap();
  
  if (!metricMap[font]) {
    // フォントが見つからない場合はMain-Regularにフォールバック
    if (font !== "Main-Regular" && metricMap["Main-Regular"]) {
      return getCharacterMetrics(character, "Main-Regular", mode);
    }
    return undefined;
  }
  
  const charCode = character.charCodeAt(0);
  const metrics = metricMap[font][charCode];
  
  if (!metrics) {
    // 文字が見つからない場合の処理
    if (mode === 'text') {
      // テキストモードでは'M'の代替を使用
      const fallbackMetrics = metricMap[font][77]; // 'M'のcharCode
      if (fallbackMetrics) {
        return {
          depth: fallbackMetrics[0],
          height: fallbackMetrics[1],
          italic: fallbackMetrics[2],
          skew: fallbackMetrics[3],
          width: fallbackMetrics[4],
        };
      }
    }
    return undefined;
  }
  
  return {
    depth: metrics[0],
    height: metrics[1],
    italic: metrics[2],
    skew: metrics[3],
    width: metrics[4],
  };
}

export function calculateTextWidth(text: string, font: string = "Main-Regular"): number {
  let totalWidth = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const metrics = getCharacterMetrics(char, font, "text");
    
    if (metrics) {
      totalWidth += metrics.width;
    } else {
      // メトリクスが見つからない場合のフォールバック
      const code = char.charCodeAt(0);
      if (code >= 0x3040 && code <= 0x309F || // ひらがな
          code >= 0x30A0 && code <= 0x30FF || // カタカナ
          code >= 0x4E00 && code <= 0x9FAF || // CJK統合漢字
          code >= 0xFF00 && code <= 0xFFEF) { // 全角英数字・記号
        totalWidth += 1.0; // 全角文字
      } else {
        totalWidth += 0.5; // 半角文字
      }
    }
  }
  
  return totalWidth;
}

export function calculateTextHeight(text: string): number {
  const lines = text.split('\n');
  return lines.length * 1.2; // 行の高さ
}

export function calculateScaledDimensions(
  text: string, 
  font: string = "Main-Regular",
  xScale: number, 
  yScale: number,
  baseFontSizePx: number = 16
): {
  originalWidthPx: number;
  originalHeightPx: number;
  scaledWidthPx: number;
  scaledHeightPx: number;
  overflowWidthPx: number;
  overflowHeightPx: number;
} {
  const originalWidthEm = calculateTextWidth(text, font);
  const originalHeightEm = calculateTextHeight(text);
  
  const originalWidthPx = originalWidthEm * baseFontSizePx;
  const originalHeightPx = originalHeightEm * baseFontSizePx;
  
  const scaledWidthPx = originalWidthPx * xScale;
  const scaledHeightPx = originalHeightPx * yScale;
  
  const overflowWidthPx = scaledWidthPx - originalWidthPx;
  const overflowHeightPx = scaledHeightPx - originalHeightPx;
  
  return {
    originalWidthPx,
    originalHeightPx,
    scaledWidthPx,
    scaledHeightPx,
    overflowWidthPx,
    overflowHeightPx
  };
}

export function calculateRotatedDimensions(
  text: string,
  font: string = "Main-Regular",
  xScale: number,
  yScale: number,
  baseFontSizePx: number = 16,
  isRotated90: boolean = false
): {
  originalWidthPx: number;
  originalHeightPx: number;
  scaledWidthPx: number;
  scaledHeightPx: number;
  overflowWidthPx: number;
  overflowHeightPx: number;
  effectiveWidthPx: number;
  effectiveHeightPx: number;
} {
  const basic = calculateScaledDimensions(text, font, xScale, yScale, baseFontSizePx);
  
  let effectiveWidthPx = basic.scaledWidthPx;
  let effectiveHeightPx = basic.scaledHeightPx;
  
  if (isRotated90) {
    effectiveWidthPx = basic.scaledHeightPx;
    effectiveHeightPx = basic.scaledWidthPx;
  }
  
  return {
    ...basic,
    effectiveWidthPx,
    effectiveHeightPx
  };
}

export function calculateRotatedLayoutAdjustments(
  text: string,
  font: string = "Main-Regular",
  xScale: number,
  yScale: number,
  containerWidthPx: number,
  baseFontSizePx: number = 16,
  isRotated90: boolean = false
): {
  needsLineBreak: boolean;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  maxWidth: string;
  isRotationAware: boolean;
} {
  const dimensions = calculateRotatedDimensions(text, font, xScale, yScale, baseFontSizePx, isRotated90);
  
  const needsLineBreak = dimensions.effectiveWidthPx > containerWidthPx;
  
  const horizontalOverflow = Math.max(0, dimensions.effectiveWidthPx - dimensions.originalWidthPx);
  const verticalOverflow = Math.max(0, dimensions.effectiveHeightPx - dimensions.originalHeightPx);
  
  const marginLeft = horizontalOverflow / 2;
  const marginRight = horizontalOverflow / 2;
  const marginTop = verticalOverflow / 2;
  const marginBottom = verticalOverflow / 2;
  
  const maxWidth = needsLineBreak ? '100%' : 'none';
  
  return {
    needsLineBreak,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    maxWidth,
    isRotationAware: isRotated90
  };
}

export function calculateLayoutAdjustments(
  text: string,
  font: string = "Main-Regular",
  xScale: number,
  yScale: number,
  containerWidthPx: number,
  baseFontSizePx: number = 16
): {
  needsLineBreak: boolean;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  maxWidth: string;
} {
  const dimensions = calculateScaledDimensions(text, font, xScale, yScale, baseFontSizePx);
  
  const needsLineBreak = dimensions.scaledWidthPx > containerWidthPx;
  
  const horizontalOverflow = Math.max(0, dimensions.overflowWidthPx);
  const hasAlphabet = /[a-zA-Z]/.test(text);
  const kerningBuffer = hasAlphabet ? baseFontSizePx * 0.15 : baseFontSizePx * 0.05;
  const marginLeft = (horizontalOverflow / 2) + kerningBuffer;
  const marginRight = (horizontalOverflow / 2) + kerningBuffer;
  
  const verticalOverflow = Math.max(0, dimensions.overflowHeightPx);
  const marginTop = verticalOverflow / 2;
  const marginBottom = verticalOverflow / 2;
  
  const maxWidth = needsLineBreak ? '100%' : 'none';
  
  return {
    needsLineBreak,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    maxWidth
  };
}
