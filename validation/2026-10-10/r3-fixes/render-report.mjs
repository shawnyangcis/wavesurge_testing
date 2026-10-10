import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import gfm from 'remark-gfm';

const source = readFileSync('reports/retest-r3-fixes-2026-10-10.md', 'utf8');
const diagram = source.match(/```mermaid\n([\s\S]*?)\n```/)[1];
writeFileSync('reports/retest-r3-fixes-flow.mmd', diagram);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
try {
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ path: 'validation/2026-10-10/qa-fixes/report-tools/mermaid.min.js' });
  const svg = await page.evaluate(async source => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', flowchart: { htmlLabels: false, curve: 'linear', nodeSpacing: 35, rankSpacing: 45 }, fontFamily: 'sans-serif' });
    return (await mermaid.render('qa-flow', source)).svg;
  }, diagram);
  writeFileSync('reports/retest-r3-fixes-flow.svg', svg);
  const html = renderToStaticMarkup(React.createElement(Markdown, { remarkPlugins: [gfm] }, source.replace(/```mermaid[\s\S]*?```/, 'FLOW_DIAGRAM_PLACEHOLDER')))
    .replace('<p>FLOW_DIAGRAM_PLACEHOLDER</p>', `<div class="diagram-tools" aria-label="流程图缩放"><button data-scale="smaller">缩小</button><button data-scale="larger">放大</button><button data-scale="fit">适合宽度</button><button data-scale="actual">原始尺寸</button><a href="retest-r3-fixes-flow.svg">打开完整 SVG</a><span>在图内滚动查看完整流程</span></div><div class="diagram">${svg}</div>`);
  const document = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R3 缺陷修复与真实回归报告</title><style>body{font:16px/1.8 system-ui,sans-serif;color:#263c37;background:#f8f7f2;max-width:1250px;margin:40px auto;padding:0 28px}h1,h2{line-height:1.35}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #c9d1ca;text-align:left;padding:12px;vertical-align:top}a{color:#21644d}.diagram{background:white;border:1px solid #c9d1ca;padding:20px;overflow:auto;max-height:1000px}.diagram svg{width:1800px;height:auto;max-width:none!important}.diagram-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;font-size:14px}.diagram-tools button{font:inherit;padding:5px 14px;border:1px solid #b0c0b6;border-radius:4px;background:#fff;color:#263c37;cursor:pointer}pre{overflow:auto;background:#e9eee9;padding:16px}</style>${html}<script>const viewport=document.querySelector('.diagram'),diagram=viewport.querySelector('svg');document.querySelectorAll('[data-scale]').forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.scale,current=diagram.getBoundingClientRect().width;const width=mode==='fit'?viewport.clientWidth-40:mode==='actual'?diagram.viewBox.baseVal.width:current*(mode==='larger'?1.25:0.8);diagram.style.width=Math.max(400,Math.min(5000,width))+'px'}));</script></html>`;
  writeFileSync('reports/retest-r3-fixes-2026-10-10.html', document);
  await page.goto('file://' + process.cwd() + '/reports/retest-r3-fixes-2026-10-10.html');
  const initialWidth = await page.locator('.diagram svg').evaluate(svg => svg.getBoundingClientRect().width);
  await page.getByRole('button', { name: '放大', exact: true }).click();
  const enlargedWidth = await page.locator('.diagram svg').evaluate(svg => svg.getBoundingClientRect().width);
  if (enlargedWidth <= initialWidth) throw new Error('diagram zoom did not increase width');
  await page.getByRole('button', { name: '适合宽度', exact: true }).click();
  const fitted = await page.locator('.diagram').evaluate(el => el.scrollWidth <= el.clientWidth + 1);
  if (!fitted) throw new Error('fit diagram width overflows');
  await page.getByRole('button', { name: '原始尺寸', exact: true }).click();
  await page.locator('.diagram').evaluate(el => { el.scrollLeft = 0; el.scrollTop = 0; });
  await page.locator('.diagram-tools').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/r3-fixes/report-flow-preview.png' });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/r3-fixes/report-cover.png' });
  await page.screenshot({ path: 'output/playwright/r3-fixes/report-preview.png', fullPage: true });
  console.log(JSON.stringify({ svg: true, renderedDiagramNodes: await page.locator('svg .node').count(), tables: await page.locator('table').count(), zoomPassed: true, fittedWithoutOverflow: fitted }));
} finally { await browser.close(); }
