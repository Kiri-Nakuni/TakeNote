/**
 * KaTeXのカスタムマクロによって生成されたHTML要素を処理し、
 * data-* 属性に基づいて動的なCSSスタイルを適用します。
 *
 * このモジュールは、\scaleboxや\rotateboxのようなカスタムコマンドの
 * レンダラー側での振る舞いを一元管理します。
 */

/** 処理対象となるdata-*属性のリスト */
const DYNAMIC_ATTRIBUTES = ['data-xscale', 'data-yscale', 'data-deg'];
/** 上記のリストから生成される、querySelectorAll用のセレクタ文字列 */
const DYNAMIC_ELEMENT_SELECTOR = DYNAMIC_ATTRIBUTES.map(attr => `span[${attr}]`).join(', ');

/**
 * プレビューエリア内の動的要素をスキャンし、スタイルを適用します。
 * @param previewElement - スタイルを適用する要素が含まれる親コンテナ。
 */
export function processDynamicHtml(previewElement: HTMLElement): void {
  // `data-*`属性を持つ可能性のあるすべてのspan要素を取得します。
  const dynamicElements: NodeListOf<HTMLElement> = previewElement.querySelectorAll(DYNAMIC_ELEMENT_SELECTOR);

  dynamicElements.forEach(el => {
    const transforms: string[] = [];

    // \scalebox の処理: data-xscale と data-yscale を解釈
    if (el.dataset.xscale || el.dataset.yscale) {
      const xScale = el.dataset.xscale || '1';
      const yScale = el.dataset.yscale || '1';
      transforms.push(`scale(${xScale}, ${yScale})`);
    }

    // \rotatebox の処理: data-deg を解釈
    if (el.dataset.deg) {
      transforms.push(`rotate(${el.dataset.deg}deg)`);
    }

    el.style.display = 'inline-block';
    el.style.transformOrigin = 'center';
    el.style.transform = transforms.join(' ');
  });
}