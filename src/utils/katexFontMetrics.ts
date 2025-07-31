/**
 * KaTeXフォントメトリクス計算ユーティリティ
 * KaTeX のデフォルトフォント（Computer Modern/Latin Modern）のメトリクスを使用して
 * テキストの幅と高さを計算します。
 */

interface FontMetrics {
  /** フォントサイズ（em単位） */
  fontSize: number;
  /** 文字幅の平均値（em単位） */
  averageCharWidth: number;
  /** 行の高さ（em単位） */
  lineHeight: number;
  /** ベースラインからの上昇高さ（em単位） */
  ascent: number;
  /** ベースラインからの下降深さ（em単位） */
  descent: number;
}

/**
 * KaTeX Computer Modern フォントの基本メトリクス
 * 実際のKaTeXのフォント定義から抽出した近似値
 */
const KATEX_FONT_METRICS: FontMetrics = {
  fontSize: 1.0, // 1em = デフォルトサイズ
  averageCharWidth: 0.5, // 平均的な文字幅
  lineHeight: 1.2, // 行間を含む高さ
  ascent: 0.8, // ベースラインから上
  descent: 0.2  // ベースラインから下
};

/**
 * 文字ごとの幅テーブル（Computer Modernフォントの近似値）
 */
const CHAR_WIDTH_TABLE: Record<string, number> = {
  // 数字
  '0': 0.5, '1': 0.5, '2': 0.5, '3': 0.5, '4': 0.5,
  '5': 0.5, '6': 0.5, '7': 0.5, '8': 0.5, '9': 0.5,
  
  // 小文字
  'a': 0.45, 'b': 0.5, 'c': 0.4, 'd': 0.5, 'e': 0.4,
  'f': 0.3, 'g': 0.5, 'h': 0.5, 'i': 0.25, 'j': 0.3,
  'k': 0.45, 'l': 0.25, 'm': 0.75, 'n': 0.5, 'o': 0.5,
  'p': 0.5, 'q': 0.5, 'r': 0.35, 's': 0.4, 't': 0.3,
  'u': 0.5, 'v': 0.45, 'w': 0.65, 'x': 0.45, 'y': 0.45, 'z': 0.4,
  
  // 大文字
  'A': 0.7, 'B': 0.65, 'C': 0.7, 'D': 0.7, 'E': 0.6,
  'F': 0.55, 'G': 0.75, 'H': 0.7, 'I': 0.35, 'J': 0.5,
  'K': 0.7, 'L': 0.55, 'M': 0.85, 'N': 0.7, 'O': 0.75,
  'P': 0.6, 'Q': 0.75, 'R': 0.65, 'S': 0.55, 'T': 0.65,
  'U': 0.7, 'V': 0.7, 'W': 0.95, 'X': 0.7, 'Y': 0.7, 'Z': 0.6,
  
  // 記号類
  ' ': 0.25, '.': 0.25, ',': 0.25, ':': 0.25, ';': 0.25,
  '!': 0.3, '?': 0.45, '-': 0.3, '=': 0.5, '+': 0.5,
  '(': 0.35, ')': 0.35, '[': 0.3, ']': 0.3, '{': 0.4, '}': 0.4,
  
  // 日本語文字（ひらがな・カタカナ・漢字）の近似
  // 実際は文字によって大きく異なるが、平均値として
  'あ': 1.0, 'い': 1.0, 'う': 1.0, 'え': 1.0, 'お': 1.0,
  'か': 1.0, 'き': 1.0, 'く': 1.0, 'け': 1.0, 'こ': 1.0,
  
  // 絵文字（KaTeX警告対策）
  '🌟': 1.2, '⚡': 1.0, '🎪': 1.2, '🌪': 1.2, '🔄': 1.0, '⚙': 1.0, '🎯': 1.2,
  '↺': 1.0,
  
  // デフォルト値として全角文字は1.0emとして扱う
};

/**
 * 文字の幅を取得（em単位）
 */
function getCharWidth(char: string): number {
  // 定義されている文字の場合
  if (CHAR_WIDTH_TABLE[char]) {
    return CHAR_WIDTH_TABLE[char];
  }
  
  // Unicode範囲による判定
  const code = char.charCodeAt(0);
  
  // 全角文字範囲（日本語、中国語、韓国語など）
  if ((code >= 0x3040 && code <= 0x309F) || // ひらがな
      (code >= 0x30A0 && code <= 0x30FF) || // カタカナ
      (code >= 0x4E00 && code <= 0x9FAF) || // CJK統合漢字
      (code >= 0xFF00 && code <= 0xFFEF)) { // 全角英数字・記号
    return 1.0; // 全角文字は1em
  }
  
  // 絵文字や特殊文字
  if (code >= 0x1F000) {
    return 1.2; // 絵文字は少し大きめ
  }
  
  // その他の半角文字
  return 0.5;
}

/**
 * テキストの幅を計算（em単位）
 * kerningとletter-spacingを考慮
 */
export function calculateTextWidth(text: string): number {
  let totalWidth = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    totalWidth += getCharWidth(char);
    
    // kerningの補正（連続する文字間の調整）
    if (i < text.length - 1) {
      const nextChar = text[i + 1];
      totalWidth += getKerningAdjustment(char, nextChar);
    }
  }
  
  // 全体にletter-spacingの補正を追加（Computer Modern フォント特有）
  const letterSpacingFactor = 0.02; // 2%のletter-spacing補正
  totalWidth += text.length * letterSpacingFactor;
  
  return totalWidth;
}

/**
 * 文字ペア間のkerning調整値を取得
 */
function getKerningAdjustment(char1: string, char2: string): number {
  // よく知られたkerningペアの調整値
  const kerningPairs: Record<string, number> = {
    // 大文字同士
    'AV': -0.1, 'AW': -0.1, 'AY': -0.1, 'AT': -0.05,
    'VA': -0.1, 'WA': -0.1, 'YA': -0.1, 'TA': -0.05,
    'LT': -0.1, 'LV': -0.1, 'LW': -0.1, 'LY': -0.1,
    'TL': -0.1, 'VL': -0.1, 'WL': -0.1, 'YL': -0.1,
    
    // 小文字との組み合わせ
    'To': -0.05, 'Tr': -0.05, 'Te': -0.05, 'Ta': -0.05,
    'Vo': -0.05, 'Ve': -0.05, 'Va': -0.05,
    'Wo': -0.05, 'We': -0.05, 'Wa': -0.05,
    'Yo': -0.05, 'Ye': -0.05, 'Ya': -0.05,
    
    // 小文字同士の一般的なkerning
    'av': -0.02, 'aw': -0.02, 'ay': -0.02,
    'va': -0.02, 'wa': -0.02, 'ya': -0.02,
    'rt': -0.02, 'rv': -0.02, 'rw': -0.02, 'ry': -0.02
  };
  
  const pair = char1 + char2;
  return kerningPairs[pair] || 0;
}

/**
 * テキストの高さを計算（em単位）
 */
export function calculateTextHeight(text: string): number {
  // 改行があるかチェック
  const lines = text.split('\n');
  return lines.length * KATEX_FONT_METRICS.lineHeight;
}

/**
 * スケールされたテキストの実際のピクセル寸法を計算
 */
export function calculateScaledDimensions(
  text: string, 
  xScale: number, 
  yScale: number,
  baseFontSizePx: number = 16 // デフォルトのフォントサイズ（ピクセル）
): {
  originalWidthPx: number;
  originalHeightPx: number;
  scaledWidthPx: number;
  scaledHeightPx: number;
  overflowWidthPx: number;
  overflowHeightPx: number;
} {
  const originalWidthEm = calculateTextWidth(text);
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

/**
 * 90度回転時の当たり判定を考慮した寸法計算
 * 回転により幅と高さが入れ替わることを考慮
 */
export function calculateRotatedDimensions(
  text: string,
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
  effectiveWidthPx: number;  // 回転考慮後の実効幅
  effectiveHeightPx: number; // 回転考慮後の実効高さ
} {
  const basic = calculateScaledDimensions(text, xScale, yScale, baseFontSizePx);
  
  let effectiveWidthPx = basic.scaledWidthPx;
  let effectiveHeightPx = basic.scaledHeightPx;
  
  // 90度回転時は幅と高さが入れ替わる
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

/**
 * 回転を考慮したレイアウト調整計算
 */
export function calculateRotatedLayoutAdjustments(
  text: string,
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
  const dimensions = calculateRotatedDimensions(text, xScale, yScale, baseFontSizePx, isRotated90);
  
  // 実効幅で改行判定
  const needsLineBreak = dimensions.effectiveWidthPx > containerWidthPx;
  
  // 実効寸法に基づくオーバーフロー計算
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

/**
 * 必要な改行幅と余白を計算（基本版）
 */
export function calculateLayoutAdjustments(
  text: string,
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
  const dimensions = calculateScaledDimensions(text, xScale, yScale, baseFontSizePx);
  
  const needsLineBreak = dimensions.scaledWidthPx > containerWidthPx;
  
  // オーバーフロー分を左右の余白として配分（kerning補正込み）
  const horizontalOverflow = Math.max(0, dimensions.overflowWidthPx);
  // アルファベットの場合はkerning分を追加考慮
  const hasAlphabet = /[a-zA-Z]/.test(text);
  const kerningBuffer = hasAlphabet ? baseFontSizePx * 0.15 : baseFontSizePx * 0.05; // アルファベット15%、その他5%のkerningバッファ
  const marginLeft = (horizontalOverflow / 2) + kerningBuffer;
  const marginRight = (horizontalOverflow / 2) + kerningBuffer;
  
  // 縦方向のオーバーフロー分を上下の余白として配分
  const verticalOverflow = Math.max(0, dimensions.overflowHeightPx);
  const marginTop = verticalOverflow / 2;
  const marginBottom = verticalOverflow / 2;
  
  // 最大幅の設定
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
