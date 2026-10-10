// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Results } from '../src/client/Results.tsx';
import { App } from '../src/client/App.tsx';
import { api } from '../src/client/api.ts';
import type { Result } from '../src/shared/research.ts';
import type { Snapshot } from '../src/shared/contracts.ts';
vi.mock('../src/client/api.ts',()=>({api:vi.fn()}));const mocked=vi.mocked(api);afterEach(()=>{cleanup();mocked.mockReset();});
const row: Result={id:'r',taskId:'t',verdict:'match',selected:false,tags:[],updatedAt:1,creator:{id:'a',handle:'alpha',platform:'instagram',displayName:'Alpha',profileUrl:'https://instagram.com/alpha/',followers:20000,region:null,raw:{},evidence:[]},judgments:[]};
it('结果界面区分独立组和Campaign分配，已分配其他组不误称本组入选',async()=>{
 const context={sourceTaskTitle:'任务',groupId:'g',groupTitle:'组',selectionScope:'campaign' as const,campaignId:'c'};
 mocked.mockResolvedValue([{...row,id:'one',reportContext:{...context,allocatedGroupTitle:'生活效率'}},{...row,id:'two',selected:true,reportContext:context},{...row,id:'three',reportContext:{...context,selectionScope:'research'}}]);
 render(<Results taskId="t" onClose={()=>{}}/>);await screen.findAllByText('Alpha');
 expect(screen.getByText('本组未入选（已分配其他组）')).toBeTruthy();expect(screen.getByText(/分配至：生活效率/)).toBeTruthy();expect(screen.getByText('已入选')).toBeTruthy();expect(screen.getByText(/研究组入选/)).toBeTruthy();
});
it('任务侧栏按补标记录和Campaign组内预选显示单位，结果链接仍指向源研究',async()=>{
 const tasks=[{id:'job',resultTaskId:'source',title:'补标',status:'completed',requested:2,evaluated:2,matched:2,updatedAt:1,detail:'完成'},{id:'child',parentCampaignId:'campaign',title:'子研究',status:'completed',requested:1,evaluated:2,matched:1,updatedAt:1,detail:'完成'}];
 const state={messages:[],tasks,epoch:0,active:false} as Snapshot;
 mocked.mockImplementation(async path=>path==='/state'?state:path.startsWith('/results')?[]:{ok:true});
 render(<App/>);await screen.findByLabelText('研究对话');expect(await screen.findByText('已处理 2 / 2 条记录 · 本轮合格记录 2 条')).toBeTruthy();expect(screen.getByText('已核验 2 · 研究组预选 1 / 1')).toBeTruthy();
 await userEvent.click(screen.getAllByRole('button',{name:'查看结果'})[0]);await screen.findByRole('dialog',{name:'研究结果'});expect(mocked.mock.calls.some(([url])=>url==='/results?taskId=source')).toBe(true);
});
