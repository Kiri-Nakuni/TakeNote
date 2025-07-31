import { calculateLayoutAdjustments, calculateRotatedLayoutAdjustments, calculateTextWidth } from './katexFontMetrics';

/** 処理対象となるdata-*属性のリスト */
const DYNAMIC_ATTRIBUTES = ['data-xscale', 'data-yscale', 'data-deg', 'data-angularvelocity', 'data-collisionaware', 'data-originalwidth', 'data-scaledwidth'];
/** 上記のリストから生成される、querySelectorAll用のセレクタ文字列 */
const DYNAMIC_ELEMENT_SELECTOR = DYNAMIC_ATTRIBUTES.map(attr => `span[${attr}]`).join(', ');

/**
 * activerotate*用の改行幅計算と適用関数
 * @param element - 回転する要素
 * @param angularVelocity - 角速度
 */
function calculateAndApplyRotationLineBreak(element: HTMLElement, angularVelocity: number): void {
  // angularVelocity パラメータは将来の機能拡張のために保持
  void angularVelocity;
  const textContent = element.textContent || '';
  const parentElement = element.parentElement;
  
  if (!parentElement) return;
  
  const parentWidth = parentElement.getBoundingClientRect().width;
  const computedStyle = window.getComputedStyle(element);
  const baseFontSize = parseFloat(computedStyle.fontSize) || 16;
  
  // 90度回転時の当たり判定を考慮したレイアウト調整
  const adjustments = calculateRotatedLayoutAdjustments(
    textContent,
    1, // スケールは1（activerotateはスケールしない）
    1,
    parentWidth,
    baseFontSize,
    true // 90度回転を考慮
  );
  
  // 文字の横幅で改行幅を強制的にオーバーライド
  const textWidthEm = calculateTextWidth(textContent);
  const textWidthPx = textWidthEm * baseFontSize;
  
  // 回転時に占める領域が親幅を超える場合の処理
  if (textWidthPx > parentWidth * 0.8) { // 80%を超える場合
    // 強制的に改行スタイルを適用
    element.style.display = 'block';
    element.style.width = 'fit-content';
    element.style.margin = '1em auto';
    element.style.textAlign = 'center';
    
    // 上下に追加余白
    element.style.marginTop = `${Math.max(textWidthPx / 4, 20)}px`;
    element.style.marginBottom = `${Math.max(textWidthPx / 4, 20)}px`;
  } else {
    // 通常のインライン表示だが余白を調整
    element.style.display = 'inline-block';
    element.style.marginLeft = `${adjustments.marginLeft}px`;
    element.style.marginRight = `${adjustments.marginRight}px`;
    element.style.marginTop = `${adjustments.marginTop}px`;
    element.style.marginBottom = `${adjustments.marginBottom}px`;
  }
  
  // デバッグ機能は無効化されています
  /*
  console.log('Collision-aware activerotate adjustment:', {
    text: textContent,
    angularVelocity,
    textWidthPx,
    parentWidth,
    forceBlock: textWidthPx > parentWidth * 0.8,
    adjustments
  });
  */
  
  // デバッグ用data属性
  element.setAttribute('data-collision-aware', 'true');
  element.setAttribute('data-text-width-px', textWidthPx.toString());
  element.setAttribute('data-force-block', (textWidthPx > parentWidth * 0.8).toString());
}

/**
 * scaleboxの改行幅を計算して適用する関数（KaTeXフォントメトリクス使用）
 * @param element - スケールされる要素
 * @param xScale - X軸のスケール倍率
 * @param yScale - Y軸のスケール倍率
 */
function calculateAndApplyLineBreakWidth(element: HTMLElement, xScale: number, yScale: number = xScale): void {
  // 要素のテキストコンテンツを取得
  const textContent = element.textContent || '';
  
  // 親要素の利用可能な幅を取得
  const parentElement = element.parentElement;
  if (!parentElement) return;
  
  const parentWidth = parentElement.getBoundingClientRect().width;
  const computedStyle = window.getComputedStyle(element);
  const baseFontSize = parseFloat(computedStyle.fontSize) || 16;
  
  // KaTeXフォントメトリクスを使用してレイアウト調整を計算
  const adjustments = calculateLayoutAdjustments(
    textContent,
    xScale,
    yScale,
    parentWidth,
    baseFontSize
  );
  
  // デバッグ機能は無効化されています
  /*
  console.log('Font metrics calculation for scalebox:', {
    text: textContent,
    xScale,
    yScale,
    parentWidth,
    baseFontSize,
    adjustments
  });
  */
  
  // 計算結果に基づいてスタイルを適用
  element.style.display = 'inline-block';
  element.style.transformOrigin = 'center';
  
  // 改行が必要な場合
  if (adjustments.needsLineBreak) {
    element.style.maxWidth = adjustments.maxWidth;
    element.style.wordBreak = 'break-word';
    element.style.overflow = 'visible';
    
    // 前後の改行を促進
    element.style.clear = 'both';
    
    // 余白の調整（オーバーフロー分を考慮）
    element.style.marginLeft = `${adjustments.marginLeft}px`;
    element.style.marginRight = `${adjustments.marginRight}px`;
  }
  
  // 縦方向の余白も調整
  element.style.marginTop = `${adjustments.marginTop}px`;
  element.style.marginBottom = `${adjustments.marginBottom}px`;
  
  // デバッグ情報をdata属性として保存
  element.setAttribute('data-text-content', textContent);
  element.setAttribute('data-x-scale', xScale.toString());
  element.setAttribute('data-y-scale', yScale.toString());
  element.setAttribute('data-needs-linebreak', adjustments.needsLineBreak.toString());
  element.setAttribute('data-margin-left', adjustments.marginLeft.toString());
  element.setAttribute('data-margin-right', adjustments.marginRight.toString());
}

/**
 * プレビューエリア内の動的要素をスキャンし、スタイルを適用します。
 * @param previewElement - スタイルを適用する要素が含まれる親コンテナ。
 */
export function processDynamicHtml(previewElement: HTMLElement): void {
  // デバッグ機能は無効化されています
  /*
  const allSpans = previewElement.querySelectorAll('span');
  console.log('All span elements found:', Array.from(allSpans).map(span => ({
    element: span,
    classes: Array.from(span.classList),
    datasets: { ...span.dataset },
    textContent: span.textContent,
    innerHTML: span.innerHTML
  })));
  
  const debugActiverotateStarElements = previewElement.querySelectorAll('.activerotate-star');
  console.log('Activerotate-star elements found:', debugActiverotateStarElements.length, Array.from(debugActiverotateStarElements));

  const nestedActiverotateElements = previewElement.querySelectorAll('.active-rotate .activerotate-star');
  console.log('Nested activerotate elements found:', nestedActiverotateElements.length, Array.from(nestedActiverotateElements));

  const collisionAwareElements = previewElement.querySelectorAll('[data-collisionaware="true"]');
  console.log('Collision-aware elements found:', collisionAwareElements.length, Array.from(collisionAwareElements));

  const angularVelocityElements = previewElement.querySelectorAll('[data-angularvelocity]');
  console.log('Angular velocity elements found:', angularVelocityElements.length, Array.from(angularVelocityElements));
  */

  // `data-*`属性を持つ可能性のあるすべてのspan要素を取得します。
  const dynamicElements: NodeListOf<HTMLElement> = previewElement.querySelectorAll(DYNAMIC_ELEMENT_SELECTOR);

  dynamicElements.forEach(el => {
    const transforms: string[] = [];

    // \scalebox の処理: data-xscale と data-yscale を解釈
    if (el.dataset.xscale || el.dataset.yscale) {
      const xScale = parseFloat(el.dataset.xscale || '1');
      const yScale = parseFloat(el.dataset.yscale || '1');
      transforms.push(`scale(${xScale}, ${yScale})`);
      
      // KaTeXフォントメトリクスを使った改行幅の計算と調整
      if (xScale !== 1 || yScale !== 1) {
        calculateAndApplyLineBreakWidth(el, xScale, yScale);
      }
    }

    // \rotatebox の処理: data-deg を解釈
    if (el.dataset.deg) {
      transforms.push(`rotate(-${el.dataset.deg}deg)`);
    }

    if (el.dataset.xmoveto != null && el.dataset.ymoveto != null && el.dataset.movetime != null) {
      const xMoveTo = el.dataset.xmoveto;
      const yMoveTo = el.dataset.ymoveto;
      const moveTime = el.dataset.movetime;

      el.style.position = 'relative';
      el.style.display = 'inline-block';
      el.style.transformOrigin = 'center';
      el.style.transform = transforms.join(' ');

      // 要素をクリックしたときの動作
      el.addEventListener('click', () => {
        el.style.transition = `transform ${moveTime}s`;
        el.style.transform = `translate(${xMoveTo}, ${yMoveTo})`;
      });
    } else if (el.dataset.angularvelocity) {
      // activerotateの場合：通常の変形は適用せず、CSS アニメーションのみ
      const angularVelocity = parseFloat(el.dataset.angularvelocity);
      
      // デバッグ機能は無効化されています
      /*
      console.log('ActiveRotate debug:', {
        element: el,
        angularVelocity: el.dataset.angularvelocity,
        collisionaware: el.dataset.collisionaware,
        allDatasets: el.dataset,
        innerHTML: el.innerHTML,
        textContent: el.textContent
      });
      */
      
      if (!isNaN(angularVelocity) && angularVelocity !== 0) {
        // 絶対値を使用してアニメーション時間を計算
        const absVelocity = Math.abs(angularVelocity);
        el.style.setProperty('--angular-velocity-abs', absVelocity.toString());
        
        // 負の値の場合は逆方向回転を設定
        const direction = angularVelocity >= 0 ? 'normal' : 'reverse';
        el.style.setProperty('--animation-direction', direction);
        
        el.classList.add('active-rotate');
        
        // collision-aware機能: 90度回転時の当たり判定を考慮
        const isCollisionAware = el.classList.contains('activerotate-star') || el.dataset.collisionaware === 'true';
        if (isCollisionAware) {
          // 新しい改行幅オーバーライド関数を使用
          calculateAndApplyRotationLineBreak(el, angularVelocity);
        }
        
        // 基本スタイルを設定
        el.style.display = 'inline-block';
        el.style.transformOrigin = 'center';
      }
    } else {
      // moveboxではない、activerotateでもない場合の基本的な変形処理
      if (transforms.length > 0) {
        el.style.display = 'inline-block';
        el.style.transformOrigin = 'center';
        el.style.transform = transforms.join(' ');
      }
    }
  });

  // 入れ子構造の activerotate-star 要素を個別に処理
  const starElements = previewElement.querySelectorAll('.activerotate-star') as NodeListOf<HTMLElement>;
  starElements.forEach(starEl => {
    // 親の .active-rotate 要素を探す
    const parentActiveRotate = starEl.closest('.active-rotate') as HTMLElement;
    if (parentActiveRotate && parentActiveRotate.dataset.angularvelocity) {
      const angularVelocity = parseFloat(parentActiveRotate.dataset.angularvelocity);
      if (!isNaN(angularVelocity) && angularVelocity !== 0) {
        // デバッグ機能は無効化されています
        /*
        console.log('Processing nested activerotate-star:', {
          starElement: starEl,
          parentElement: parentActiveRotate,
          angularVelocity
        });
        */
        
        // collision-aware処理を適用
        calculateAndApplyRotationLineBreak(starEl, angularVelocity);
      }
    }
  });

  // .reflectbox クラスのスタイリング
  const reflectElements: NodeListOf<HTMLElement> = previewElement.querySelectorAll('.reflectbox');
  reflectElements.forEach(el => {
    el.style.display = 'inline-block';
    el.style.transform = 'scaleX(-1)';
  });
}
