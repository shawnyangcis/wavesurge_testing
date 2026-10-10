import{expect,it}from'vitest';import{creatorIdentity,countryCode}from'../src/server/canonical.ts';
it('四平台主页身份、保留 YouTube channel 大小写、URL fallback 与保留路径不会错误折叠',()=>{
 const id=(platform:any,profileUrl:string,handle='')=>creatorIdentity({platform,profileUrl,handle});
 expect(id('tiktok','https://www.tiktok.com/@USER?lang=en')).toBe('tiktok:user');expect(id('tiktok','https://tiktok.com/')).toBe('tiktok:https://tiktok.com');expect(id('tiktok','https://tiktok.com/video/1','user')).toBe('tiktok:user');
 expect(id('youtube','https://m.youtube.com/@User/videos')).toBe('youtube:user');expect(id('youtube','https://youtube.com/')).toBe('youtube:https://youtube.com');expect(id('youtube','https://youtube.com/channel')).toBe('youtube:https://youtube.com/channel');
 expect(id('instagram','https://instagram.com/p/123','person')).toBe('instagram:person');expect(id('instagram','https://instagram.com/accounts')).toBe('instagram:https://instagram.com/accounts');expect(id('twitter','https://mobile.twitter.com/home','person')).toBe('twitter:person');expect(id('twitter','https://x.com/i/status/123','person')).toBe('twitter:person');
 expect(id('instagram','invalid')).toBe('instagram:invalid');expect(id('instagram','invalid','@Person')).toBe('instagram:person');expect(countryCode('unrecognized')).toBeUndefined();expect(countryCode('New York, U.S.')).toBe('US');
});
