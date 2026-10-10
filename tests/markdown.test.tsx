// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Markdown } from '../src/client/Markdown.tsx';
afterEach(cleanup);
it('GFM 表格呈现为可读表格', () => {
  render(<Markdown text={'| 类型 | 配额 |\n| --- | --- |\n| 科技 | 2 |'} />);
  expect(screen.getByRole('table')).toBeTruthy(); expect(screen.getByRole('cell', { name: '科技' })).toBeTruthy();
});
it('可读的 Markdown、来源链接，不执行 HTML 或外部追踪图片', () => {
  render(<Markdown text={'**已核验**\n\n- 一个结果\n\n[来源](https://source.test)\n\n![追踪图片](https://tracker.test/a.png)\n\n<script>alert(1)</script>\n\n[恶意](javascript:alert(1))'} />);
  expect(screen.getByText('已核验').tagName).toBe('STRONG'); expect(screen.getByRole('link', { name: '来源' }).getAttribute('href')).toBe('https://source.test'); expect(screen.queryByRole('img')).toBeNull(); expect(document.querySelector('script')).toBeNull(); expect(screen.getByText('恶意').getAttribute('href')).not.toContain('javascript:');
});
