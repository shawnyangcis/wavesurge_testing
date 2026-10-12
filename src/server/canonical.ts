import type { Creator } from '../shared/research.ts';
const countries = new Map<string, string>();
const codes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
for (const locale of ['en', 'zh-CN']) {
  const names = new Intl.DisplayNames(locale, { type: 'region' });
  for (const code of codes) { countries.set(code.toLowerCase(), code); countries.set(names.of(code)!.toLowerCase(), code); }
}
for (const [alias, code] of [['usa', 'US'], ['u.s.', 'US'], ['u.s.a.', 'US'], ['united states of america', 'US'], ['uk', 'GB'], ['u.k.', 'GB'], ['great britain', 'GB'], ['czech republic', 'CZ'], ['south korea', 'KR'], ['russia', 'RU']]) countries.set(alias, code);
export function countryCode(value: string) { return countries.get(value.split(',').at(-1)!.trim().toLowerCase()); }
export function creatorIdentity(creator: Pick<Creator, 'platform' | 'handle' | 'profileUrl'>) {
  const handle = creator.handle.replace(/^@/, '').toLowerCase();
  let identity = handle;
  try {
    const url = new URL(creator.profileUrl); const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    const segments = url.pathname.split('/').filter(Boolean);
    if (creator.platform === 'instagram' && host === 'instagram.com' && segments.length === 1 && !['p', 'reel', 'explore', 'accounts'].includes(segments[0].toLowerCase())) identity = segments[0].toLowerCase();
    if (creator.platform === 'twitter' && ['x.com', 'twitter.com'].includes(host) && segments.length === 1 && !['home', 'search', 'i', 'intent'].includes(segments[0].toLowerCase())) identity = segments[0].toLowerCase();
    if (creator.platform === 'tiktok' && host === 'tiktok.com' && segments[0]?.startsWith('@')) identity = segments[0].slice(1).toLowerCase();
    if (creator.platform === 'youtube' && host === 'youtube.com') {
      if (segments[0] === 'channel' && segments[1]) identity = `channel/${segments[1]}`;
      if (segments[0]?.startsWith('@')) identity = segments[0].slice(1).toLowerCase();
    }
    url.search = ''; url.hash = ''; url.hostname = host;
    if (!identity) identity = url.toString().replace(/\/$/, '');
  } catch { if (!identity) identity = creator.profileUrl; }
  return `${creator.platform}:${identity}`;
}
