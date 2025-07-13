declare module 'markdown-it-texmath' {
    import type MarkdownIt from 'markdown-it';
    import type { KatexOptions } from 'katex';

    /** markdown-it-texmath プラグインに渡すオプションの型 */
    interface TexMathOptions {
    /** レンダリングに使用するエンジン（katexなど） */
    engine: object;
    /** 数式を囲むデリミタの種類 */
    delimiters?: string;
    /** KaTeXに渡す追加のオプション */
    katexOptions?: KatexOptions;
  }

  const texmath: (md: MarkdownIt, options?: TexMathOptions) => void;
  export default texmath;
}
