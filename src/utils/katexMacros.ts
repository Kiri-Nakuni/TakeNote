/**
 * KaTeXで利用するカスタムマクロの定義。
 * このファイルでマクロを一元管理することで、プレビューコンポーネントの見通しを良くします。
 */
export const katexMacros = {
  "\\reflectbox": "\\htmlClass{reflectbox}{#1}",
  "\\scalebox": "\\@ifstar{\\scalebox@xyz}{\\scalebox@xy}",
  "\\scalebox@xyz": "\\htmlData{xscale=#1, yscale=#2}{#3}",
  "\\scalebox@xy": "\\htmlData{xscale=#1, yscale=#1}{#2}",
  "\\XeTeX": "\\textrm{\\html@mathml{X\\kern-.125em\\raisebox{-0.5ex}{\\reflectbox{E}}\\kern-.1667emT\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{XeTeX}}",
  "\\rotatebox": "\\htmlData{deg=#1}{#2}",
  "\\movebox": "\\htmlData{xmoveto=#1,ymoveto=#2,movetime=#3}{#4}",
  "\\activerotate": "\\htmlData{angularvelocity=#1}{#2}",
  "\\activerotatestar": "\\htmlData{angularvelocity=#1}{\\htmlClass{activerotate-star}{#2}}",
  "\\arstar": "\\htmlData{angularvelocity=#1}{\\htmlClass{activerotate-star}{#2}}",
  "\\jTeX": "\\raisebox{-0.6ex}{\\text{J}}\\kern-.2em\\TeX",
  "\\jLaTeX":"\\raisebox{-0.6ex}{\\text{J}}\\kern-.1em\\LaTeX",
  "\\XeLaTeX": "\\textrm{X\\kern-.125em\\raisebox{-0.5ex}{\\reflectbox{E}}\\kern-.1667em\\LaTeX}"
};
