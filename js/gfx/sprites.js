/* Pixel sprites (ASCII art, 16x16) + procedural pixel portraits. Rendered once to cached canvases. */
(function (root) {
  'use strict';
  const G = root.G;

  const PAL = {
    k: '#0b0a1a', K: '#242038', d: '#4a4e6a', g: '#9aa0b8', l: '#d9dcef', w: '#ffffff',
    r: '#ff4d6d', R: '#a81d3c', o: '#ff9b3d', O: '#c25e12', y: '#ffe45c', Y: '#c9a227',
    G: '#5cf27a', e: '#2a9d4a', c: '#3ee6ff', C: '#1a8fb3', b: '#3fa7ff', B: '#2446b3',
    p: '#b04dff', P: '#5f2aa8', m: '#ff5cc8', M: '#b02a86', s: '#f2c9a5', S: '#c9926b',
    n: '#8a5a3a', N: '#4f3220', t: '#ffd9a8', v: '#7a5cff', x: '#ff2e2e',
  };

  const S = {};
  function def(name, rows, pal) { S[name] = { rows, pal: pal || null }; }

  def('strawberry', [
    '.......e........',
    '.....eGGe.e.....',
    '......eGGGe.....',
    '....kkkGGkkk....',
    '...krrrrrrrrk...',
    '..krrywrrryrrk..',
    '..krrrrrrrrrrk..',
    '..kryrrrryrrrk..',
    '..krrrrrrrrrrk..',
    '...krrryrrrrk...',
    '...krrrrrryrk...',
    '....krryrrrk....',
    '.....krrrrk.....',
    '......krrk......',
    '.......kk.......',
    '................']);
  def('apple', [
    '........N.......',
    '.......Ne.GG....',
    '.......NeGGe....',
    '....kkkNkkk.....',
    '...krrrrrrrrk...',
    '..krrwwrrrrrrk..',
    '..krwwrrrrrrrk..',
    '..krrrrrrrrrrk..',
    '..krrrrrrrrrrk..',
    '..krrrrrrrrRrk..',
    '..krrrrrrrrRrk..',
    '...krrrrrrRRk...',
    '...krrRkkRRrk...',
    '....kkk..kkk....',
    '................',
    '................']);
  def('gpu', [
    '................',
    '................',
    '................',
    'kkkkkkkkkkkkkkkk',
    'kddddddddddddddk',
    'kdkkkkkdkkkkkdgk',
    'kdkgggkdkgggkdgk',
    'kdkgKgkdkgKgkdgk',
    'kdkgggkdkgggkdgk',
    'kdkkkkkdkkkkkdgk',
    'kddddddddddddddk',
    'kkkkkkkkkkkkkkkk',
    '.kykykykykyk....',
    '.kkkkkkkkkkk....',
    '................',
    '................']);
  def('chip', [
    '................',
    '....k.k.k.k.....',
    '...kkkkkkkkk....',
    '.kkkdddddddkkk..',
    '...kdpppppdk....',
    '.kkkdpcccpdkkk..',
    '...kdpcwcpdk....',
    '.kkkdpcccpdkkk..',
    '...kdpppppdk....',
    '.kkkdddddddkkk..',
    '...kkkkkkkkk....',
    '....k.k.k.k.....',
    '................',
    '................',
    '................',
    '................']);
  def('server', [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..kyyyyyyyyyyk..',
    '..kYkYkYkYkYyk..',
    '..kyyyyyyyyyyk..',
    '..kYkYkYkYkYyk..',
    '..kyyyyyyyyyyk..',
    '..kYkYkYkYkYyk..',
    '..kyyyyyyyyyyk..',
    '..kyGyryyyyyyk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................']);
  def('rack', [
    '...kkkkkkkkkk...',
    '...kKKKKKKKKk...',
    '...kKGKcKKddk...',
    '...kKKKKKKKKk...',
    '...kKcKGKKddk...',
    '...kKKKKKKKKk...',
    '...kKGKGKKddk...',
    '...kKKKKKKKKk...',
    '...kKcKcKKddk...',
    '...kKKKKKKKKk...',
    '...kKGKcKKddk...',
    '...kKKKKKKKKk...',
    '...kKcKGKKddk...',
    '...kKKKKKKKKk...',
    '...kkkkkkkkkk...',
    '....k......k....']);
  def('datacenter', [
    '................',
    '................',
    '................',
    '.......c........',
    '......kkk.......',
    '.kkkkkkkkkkkkkk.',
    '.kllllllllllllk.',
    '.kldcdldcdldcdk.',
    '.kllllllllllllk.',
    '.kldGdldGdldGdk.',
    '.kllllllllllllk.',
    '.kldcdldcdldcdk.',
    '.kllllllllllllk.',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................']);
  def('factory', [
    '................',
    '..gg............',
    '..gg....gg......',
    '..kk....gg......',
    '..kk....kk......',
    '..kk....kk......',
    '..kk..k.kk.k....',
    '..kk.kmkkkkmk...',
    '.kkkkmmmkkmmmk..',
    '.kddmmmmmmmmmmk.',
    '.kdddddddddddmk.',
    '.kdcdcddcdcdddk.',
    '.kdddddddddddd k'.replace(' ', 'd'),
    '.kdcdcddkkkdddk.',
    '.kkkkkkkkkkkkkk.',
    '................']);
  def('prism', [
    '................',
    '................',
    '.......kk.......',
    '......kwwk......',
    '......kwck......',
    '.....kwccck.....',
    '.....kwccck.....',
    '....kwcccbck....',
    '....kwccbbck....',
    '...kwccbbbcck...',
    '...kwcbbbbbck...',
    '..kkkkkkkkkkkk..',
    'rroyyGGccbbppmm.',
    '................',
    '................',
    '................']);
  def('satellite', [
    '................',
    '................',
    '.kkkk.....kkkk..',
    '.kbBk.....kbBk..',
    '.kBbk.kkk.kBbk..',
    '.kbBkkgggkkbBk..',
    '.kBbkglwgkkBbk..',
    '.kbBkkgggkkbBk..',
    '.kBbk.kkk.kBbk..',
    '.kkkk..k..kkkk..',
    '.......k........',
    '......kyk.......',
    '.......k........',
    '................',
    '................',
    '................']);
  def('moon', [
    '................',
    '.....kkkkk......',
    '...kklllllkk....',
    '..klllglllllk...',
    '..kllggllllllk..',
    '.klllllllgglllk.',
    '.kllllllggglllk.',
    '.klgglllllllllk.',
    '.klggllllllglk..',
    '.kllllllllggllk.',
    '..kllllglllllk..',
    '..kkllllllllkk..',
    '....kkllllkk....',
    '......kkkk......',
    '................',
    '................']);
  def('atom', [
    '................',
    '......mmmm......',
    '....mm....mm....',
    '...m..cccc..m...',
    '..m.cc....cc.m..',
    '..mc..pppp..cm..',
    '.mc..pwwwwp..cm.',
    '.mc..pwppwp..cm.',
    '.mc..pwppwp..cm.',
    '.mc..pwwwwp..cm.',
    '..mc..pppp..cm..',
    '..m.cc....cc.m..',
    '...m..cccc..m...',
    '....mm....mm....',
    '......mmmm......',
    '................']);
  def('pylon', [
    '.......kk.......',
    '......kggk......',
    '.kkkkkkggkkkkkk.',
    '.....kgkkgk.....',
    '....kgk..kgk....',
    '.kkkkkkkkkkkkkk.',
    '....kgk..kgk....',
    '....kkgkkgkk....',
    '.....kggggk.....',
    '....kgkkkkgk....',
    '....kgk..kgk....',
    '...kgk....kgk...',
    '...kgk....kgk...',
    '..kgk......kgk..',
    '..kkk......kkk..',
    '................']);
  def('turbine', [
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '...kggggggggk...',
    '..kgdgdgdgdggk..',
    '..kglgygygyggkkk',
    '..kgdgdgdgdgggok',
    '..kglgygygyggkkk',
    '..kgdgdgdgdggk..',
    '...kggggggggk...',
    '....kkkkkkkk....',
    '....kk....kk....',
    '...kkkk..kkkk...',
    '................',
    '................']);
  def('solar', [
    '..y.....y.......',
    '...y.yy.........',
    '....yyyy........',
    '..yyyyyy.y......',
    '....yyyy........',
    '...y.yy.y.......',
    '................',
    '....kkkkkkkkkkk.',
    '...kbBbBbBbBbk..',
    '..kBbBbBbBbBk...',
    '.kbBbBbBbBbk....',
    'kkkkkkkkkkk.....',
    '.....kk.........',
    '.....kk.........',
    '....kkkk........',
    '................']);
  def('nuclear', [
    '................',
    '..kkkk....kkkk..',
    '..kllk....kllk..',
    '..kllk....kllk..',
    '.kllllk..kllllk.',
    '.kllllk..kllllk.',
    'kllllllkkllllllk',
    'klyyyllkkllyyylk',
    'klykyllkklykyllk',
    'klyyyllkklyyyllk',
    'kllllllkkllllllk',
    'kkkkkkkkkkkkkkkk',
    '.cc..cc..cc..cc.',
    '................',
    '................',
    '................']);
  def('sun', [
    '.......y........',
    '..y....y....y...',
    '...y.......y....',
    '.....ooooo......',
    '....oyyyyyo.....',
    '...oyyywyyyo....',
    'yy.oyywwyyyo.yy.',
    '...oyyyyyyyo....',
    '...oyyyyyyyo....',
    '....oyyyyyo.....',
    '.....ooooo......',
    '...y.......y....',
    '..y....y....y...',
    '.......y........',
    '................',
    '................']);
  def('dyson', [
    '....c..c..c.....',
    '..c.kkkkkkk.c...',
    '...kc.c.c.ck....',
    '.ckc.ooooo.ckc..',
    '..k.oyyyyyo.k...',
    '.ck.oywwyyo.kc..',
    '..kcoywwyyock...',
    '.ck.oyyyyyo.kc..',
    '..k.oyyyyyo.k...',
    '.ckc.ooooo.ckc..',
    '...kc.c.c.ck....',
    '..c.kkkkkkk.c...',
    '....c..c..c.....',
    '................',
    '................',
    '................']);
  def('person', [
    '................',
    '......kkkk......',
    '.....kNNNNk.....',
    '.....kssssk.....',
    '.....kskskk.....',
    '.....kssssk.....',
    '......kssk......',
    '....kkkkkkkk....',
    '...kbbbbbbbbk...',
    '...kbbbbbbbbk...',
    '...kbkbbbbkbk...',
    '...kskbbbbksk...',
    '....kkbbbbkk....',
    '.....kBkkBk.....',
    '.....kBk.kBk....',
    '.....kkk.kkk....']);
  def('crowd', [
    '................',
    '................',
    '..kk.....kk.....',
    '.kNNk...kNNk....',
    '.kssk.kkksskk...',
    '.kssk.kNNkssk...',
    '..kk..kssk.k....',
    '.kbbk.kssk.kbk..',
    'kbbbbk.kk.kppk..',
    'kbbbbkkmmkkpppk.',
    'kbbbbkmmmmkpppk.',
    '.kbbkkmmmmkkppk.',
    '.kbbk.kmmk.kppk.',
    '.kkkk.kkkk.kkkk.',
    '................',
    '................']);
  def('robot', [
    '.......k........',
    '.......r........',
    '....kkkkkkk.....',
    '...kgggggggk....',
    '...kgccgccgk....',
    '...kgccgccgk....',
    '...kgggggggk....',
    '...kgkkkkkgk....',
    '....kkkkkkk.....',
    '..kkdddddddkk...',
    '.kgkdgggggdkgk..',
    '.kgkdgyyygdkgk..',
    '.kgkdgggggdkgk..',
    '..k.kdddddk.k...',
    '....kdk.kdk.....',
    '....kkk.kkk.....']);
  def('spider', [
    '................',
    '.k.....k....k...',
    '..k....k...k....',
    '...k..kkk.k.....',
    'kk..kkdddkk..kk.',
    '..kkkdrdrdkkk...',
    '....kdddddk.....',
    '..kkkdddddkkk...',
    'kk..kkdddkk..kk.',
    '...k..kkk..k....',
    '..k.........k...',
    '.k...........k..',
    '................',
    '................',
    '................',
    '................']);
  def('book', [
    '................',
    '................',
    '..kkkkkkkkkkk...',
    '..kbbbbbbbbbkk..',
    '..kbwwwwwwbbkwk.',
    '..kbbbbbbbbbkwk.',
    '..kbwwwwwbbbkwk.',
    '..kbbbbbbbbbkwk.',
    '..kbwwwwwwbbkwk.',
    '..kbbbbbbbbbkwk.',
    '..kbbbbbbbbbkwk.',
    '..kkkkkkkkkkkwk.',
    '...kwwwwwwwwwwk.',
    '...kkkkkkkkkkkk.',
    '................',
    '................']);
  def('globe', [
    '................',
    '.....kkkkkk.....',
    '...kkbbbGbbkk...',
    '..kbbGGGbbbbbk..',
    '..kbGGGGGbbGbk..',
    '.kbbbGGGbbGGGbk.',
    '.kbbbbGbbbbGGbk.',
    '.kbbbbbbbbbbbbk.',
    '.kbbGGbbbbbbbbk.',
    '.kbGGGGbbbbGbbk.',
    '..kbGGGbbbGGbk..',
    '..kbbGbbbbbbbk..',
    '...kkbbbbbbkk...',
    '.....kkkkkk.....',
    '................',
    '................']);
  def('bird', [
    '................',
    '................',
    '..........kkk...',
    '.........kbbbk..',
    '...k....kbbwbkk.',
    '..kbk...kbbbbyyk',
    '..kbbk.kbbbbbkk.',
    '..kbbbkbbbbbbk..',
    '...kbbbbbbbbbk..',
    '...kbbbbbbbbk...',
    '....kbbbbbbk....',
    '.....kkbbbk.....',
    '...kkbbkkk......',
    '....kkk.........',
    '................',
    '................']);
  def('code', [
    '................',
    '..kkkkkkkkkkkk..',
    '..kKKKKKKKKKKk..',
    '..kKGKKKKKKKKk..',
    '..kKKGKKKKKKKk..',
    '..kKGKKyyyyKKk..',
    '..kKKKKKKKKKKk..',
    '..kKccccKKKKKk..',
    '..kKKKKccccKKk..',
    '..kKpppKKKKKKk..',
    '..kKKKKKKKKKKk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................']);
  def('terminal', [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kdrdydGddddddk.',
    '.kkkkkkkkkkkkkk.',
    '.kKKKKKKKKKKKKk.',
    '.kKGKKKKKKKKKKk.',
    '.kKKGKKKKKKKKKk.',
    '.kKGKKwwwKKKKKk.',
    '.kKKKKKKKKKKKKk.',
    '.kKwwwwwwwKKKKk.',
    '.kKKKKKKKKKKKKk.',
    '.kKwwwwKKKKKKKk.',
    '.kKKKKKKKKKKKKk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................']);
  def('video', [
    '................',
    '................',
    '..kkkkkkkkkk....',
    '..kddddddddk.kk.',
    '..kdKKKKKKdkkrk.',
    '..kdKrKKKKdkrrk.',
    '..kdKrrKKKdkrrk.',
    '..kdKrKKKKdkkrk.',
    '..kdKKKKKKdk.kk.',
    '..kddddddddk....',
    '..kkkkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('gear', [
    '................',
    '......kkk.......',
    '...kk.kgk.kk....',
    '...kgkkgkkgk....',
    '....kggggggk....',
    '.kkkggkkkggkkk..',
    '.kgggk...kgggk..',
    '.kkkgk...kgkkk..',
    '....kggkggk.....',
    '...kgkkgkkgk....',
    '...kk.kgk.kk....',
    '......kkk.......',
    '................',
    '................',
    '................',
    '................']);
  def('gym', [
    '................',
    '................',
    '................',
    '..kk........kk..',
    '.kddk......kddk.',
    'kkddkkkkkkkkddkk',
    'kgddgggggggggddgk'.slice(0, 16),
    'kkddkkkkkkkkddkk',
    '.kddk......kddk.',
    '..kk........kk..',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('planet', [
    '................',
    '.....kkkkkk.....',
    '...kkbbbbbbkk...',
    '..kbbcbbbbbbbk..',
    '.kbbccbbbbbbbbk.',
    'kkkkkkkkkkkkkkkk',
    'kyyyyyyyyyyyyyyk',
    'kkkkkkkkkkkkkkkk',
    '.kbbbbbbbbbbbbk.',
    '.kbbbbbbbbbbbbk.',
    '..kbbbbbbbbbbk..',
    '...kkbbbbbbkk...',
    '.....kkkkkk.....',
    '................',
    '................',
    '................']);
  def('orb', [
    '.....kkkkkk.....',
    '...kkppppppkk...',
    '..kpppmmmmpppk..',
    '.kppmmwwmmmmppk.',
    '.kpmmwwwmmmmmpk.',
    'kppmmwwmmmmmmppk',
    'kpmmmmmmmmmmmmpk',
    'kpmmmmmmmmmmmmpk',
    'kpmmmmmmmmmmmmpk',
    'kppmmmmmmmmmmppk',
    '.kpmmmmmmmmmmpk.',
    '.kppmmmmmmmmppk.',
    '..kpppmmmmpppk..',
    '...kkppppppkk...',
    '.....kkkkkk.....',
    '................']);
  def('shoggoth', [
    '...ee.....ee....',
    '..eGGe...eGGe...',
    '..eGeGeeeGeGe...',
    '...eGGGGGGGe....',
    '..eGGkkkkkGGe...',
    '.eGGkyyyyykGGe..',
    '.eGkyykyykyykGe.',
    'eGGkyyyyyyyykGGe',
    'eGGkykyyyykykGGe',
    '.eGkyykkkkyykGe.',
    '.eGGkyyyyyyykGe.',
    '..eGGkkkkkkkGe..',
    '.eGeGGGGGGGGGe..',
    'eGe.eGeGGeGeGe..',
    'ee..ee.ee.ee.ee.',
    '................']);
  def('infinity', [
    '................',
    '................',
    '................',
    '................',
    '..kkkk....kkkk..',
    '.kmmmmk..kccccK.'.replace('K', 'k'),
    'kmk..kmkkck..kck',
    'km....kmck....ck',
    'kmk..kckkmk..kmk',
    '.kccccK..kmmmmk.'.replace('K', 'k'),
    '..kkkk....kkkk..',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('paper', [
    '................',
    '...kkkkkkkkk....',
    '...kwwwwwwwkk...',
    '...kwddddwwkwk..',
    '...kwwwwwwwkkkk.',
    '...kwdddddddwwk.',
    '...kwwwwwwwwwwk.',
    '...kwddddddddwk.',
    '...kwwwwwwwwwwk.',
    '...kwdddddddwwk.',
    '...kwwwwwwwwwwk.',
    '...kwddddwwwwwk.',
    '...kwwwwwwwwwwk.',
    '...kkkkkkkkkkkk.',
    '................',
    '................']);
  def('scroll', [
    '................',
    '..kkkkkkkkkkk...',
    '.ktttttttttttk..',
    '..kkttttttttkk..',
    '...kttNNNNttk...',
    '...kttttttttk...',
    '...ktNNNNNNtk...',
    '...kttttttttk...',
    '...ktNNNNttttk..'.slice(0, 16),
    '...kttttttttk...',
    '...ktNNNNNttk...',
    '..kkttttttttkk..',
    '.ktttttttttttk..',
    '..kkkkkkkkkkk...',
    '................',
    '................']);
  def('eye', [
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkwwwwwwkk...',
    '..kwwwkkkkwwwk..',
    '.kwwwkcccckwwwk.',
    'kwwwkccKKcckwwwk',
    'kwwwkccKKcckwwwk',
    '.kwwwkcccckwwwk.',
    '..kwwwkkkkwwwk..',
    '...kkwwwwwwkk...',
    '.....kkkkkk.....',
    '................',
    '................',
    '................']);
  def('chart', [
    '................',
    '.k..............',
    '.k...........G..',
    '.k..........G...',
    '.k.........G....',
    '.k........G.....',
    '.k.......G......',
    '.k......G.......',
    '.k.....G........',
    '.k....G.........',
    '.k...G..........',
    '.k..G...........',
    '.k.G............',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................']);
  def('go', [
    '................',
    '.nnnnnnnnnnnnnn.',
    '.nNnNnNnNnNnNnn.',
    '.nnkknnnnnnnnnn.',
    '.nkKKknNnNnwwnn.',
    '.nkKKknnnnwllwn.',
    '.nnkknNnNnwllwn.',
    '.nnnnnnnnnnwwnn.',
    '.nNnNnkkkNnNnNn.',
    '.nnnnkKKKknnnnn.',
    '.nNnNkKKKkNnNnn.',
    '.nnnnnkkknnnnnn.',
    '.nnnnnnnnnnnnnn.',
    '................',
    '................',
    '................']);
  def('galaxy', [
    '................',
    '.......p....w...',
    '.....ppppp......',
    '...ppmmmmppp....',
    '..ppm....mmpp...',
    '.pm...ww...mp...',
    '.pm..wyyw...mp..',
    '.pm..wyyw..mmp..',
    '..mp..ww..mmp...',
    '..pmm....mmp....',
    '...ppmmmmpp.....',
    '.w...ppppp......',
    '.......p........',
    '................',
    '................',
    '................']);
  def('anime', [
    '................',
    '....kkkkkkk.....',
    '...kPPPPPPPk....',
    '..kPPPPPPPPPk...',
    '..kPPsssssPPk...',
    '..kPsssssssPk...',
    '..kPkkssskkPk...',
    '..kPcwsscwsPk...',
    '..kPssssssssk...',
    '..kPsssmmsssk...',
    '...kPsssssk.....',
    '...kkkssskk.....',
    '..kppppppppk....',
    '.kppppppppppk...',
    '.kppppppppppk...',
    '................']);
  def('dragon', [
    '................',
    '..........kk....',
    '.........kGGk...',
    '..kk....kGGkGk..',
    '.kGGk..kGGGGGyk.',
    '.kGeGkkGGGGGGGk.',
    '..kGeGGGGGkkkk..',
    '...kGGGGGGk.....',
    '..kGGeGGGGk.....',
    '.kGGkeeGGGGk....',
    '.kGk.keGGGGGk...',
    '..k...kkGGkGGk..',
    '........kk.kk...',
    '................',
    '................',
    '................']);
  def('bridge', [
    '................',
    '...kk......kk...',
    '...rr......rr...',
    '...rr......rr...',
    '..rrrr....rrrr..',
    '.r.rr.r..r.rr.r.',
    'r..rr..rr..rr..r',
    '...rr......rr...',
    'rrrrrrrrrrrrrrrr',
    'RRRRRRRRRRRRRRRR',
    '...rr......rr...',
    'bbbrrbbbbbbrrbbb',
    'bBbrrbBbBbBrrbBb',
    'bbbbbbbbbbbbbbbb',
    '................',
    '................']);
  def('lightning', [
    '................',
    '........kkkk....',
    '.......kyyyk....',
    '......kyyyk.....',
    '.....kyyyk......',
    '....kyyykkkk....',
    '...kyyyyyyyk....',
    '...kkkkyyyk.....',
    '......kyyk......',
    '.....kyyk.......',
    '....kyyk........',
    '....kyk.........',
    '....kk..........',
    '................',
    '................',
    '................']);
  def('whale', [
    '................',
    '................',
    '..........b..b..',
    '...........bb...',
    '....kkkkkkk.b...',
    '...kbbbbbbbkk...',
    '..kbbbbbbbbbbk..',
    '.kbbwkbbbbbbbbkk',
    '.kbbbbbbbbbbbkbk',
    '.kllllbbbbbbkbbk',
    '..kllllllbbk.kk.',
    '...kkkkkkkk.....',
    '................',
    '................',
    '................',
    '................']);
  def('lock', [
    '................',
    '.....kkkkk......',
    '....kgggggk.....',
    '...kgk...kgk....',
    '...kgk...kgk....',
    '..kkkkkkkkkkk...',
    '..kyyyyyyyyyk...',
    '..kyyyykyyyyk...',
    '..kyyykkkyyyk...',
    '..kyyyykyyyyk...',
    '..kyyyykyyyyk...',
    '..kYYYYYYYYYk...',
    '..kkkkkkkkkkk...',
    '................',
    '................',
    '................']);
  def('snake', [
    '................',
    '.....kkkk.......',
    '....kGGGGk......',
    '...kGrGGrGk.....',
    '...kGGGGGGk.....',
    '....kkGGkk......',
    '..kkkGGk........',
    '.kGGGGk.........',
    '.kGeeGGkkkk.....',
    '..kkkeGGGGGk....',
    '.....kkkkeGGk...',
    '..kkkkkkkeGGk...',
    '.kGGGGGGGGGk....',
    '..kkkkkkkkk.....',
    '................',
    '................']);
  def('helix', [
    '................',
    '..b........m....',
    '...b......m.....',
    '....bllllm......',
    '.....b..m.......',
    '......bm........',
    '......mb........',
    '.....m..b.......',
    '....mllllb......',
    '...m......b.....',
    '..m........b....',
    '...m......b.....',
    '....mllllb......',
    '.....m..b.......',
    '......mb........',
    '................']);
  def('heart', [
    '................',
    '................',
    '..kkk....kkk....',
    '.kmmmk..kmmmk...',
    'kmmwmmkkmmmmmk..',
    'kmwmmmmmmmmmmk..',
    'kmmmmmmmmmmmmk..',
    'kmmmmmmmmmmmmk..',
    '.kmmmmmmmmmmk...',
    '..kmmmmmmmmk....',
    '...kmmmmmmk.....',
    '....kmmmmk......',
    '.....kmmk.......',
    '......kk........',
    '................',
    '................']);
  def('hourglass', [
    '................',
    '..kkkkkkkkkkk...',
    '..knnnnnnnnnk...',
    '...kwyyyyywk....',
    '...kwyyyyywk....',
    '....kwyyywk.....',
    '.....kwywk......',
    '......kyk.......',
    '.....kw.wk......',
    '....kw.y.wk.....',
    '...kw.yyy.wk....',
    '...kwyyyyywk....',
    '..knnnnnnnnnk...',
    '..kkkkkkkkkkk...',
    '................',
    '................']);
  def('star', [
    '.......k........',
    '......kyk.......',
    '......kyk.......',
    '.....kyyyk......',
    'kkkkkkyyyykkkkk.',
    '.kyyyyywyyyyyk..',
    '..kyyyywyyyyk...',
    '...kyyyyyyyk....',
    '...kyyyyyyyk....',
    '..kyyyykyyyyk...',
    '..kyyk...kyyk...',
    '.kyk.......kyk..',
    '.kk.........kk..',
    '................',
    '................',
    '................']);
  def('brain', [
    '................',
    '....kkkkkkk.....',
    '..kkmmmmmmmkk...',
    '.kmmMmmmMmmmmk..',
    'kmmMmmMmmmMmmmk.',
    'kmMmmmMmmMmMmmk.',
    'kmmmMmmmMmmmMmk.',
    'kmMmmmmMmmMmmmk.',
    'kmmMmmMmmMmmmmk.',
    '.kmmmMmmmmmMmk..',
    '..kkmmmMmmmkk...',
    '....kkkmmkk.....',
    '......kmmk......',
    '......kkkk......',
    '................',
    '................']);
  def('capture', [
    '................',
    '.....kkkkkk.....',
    '...kkrrrrrrkk...',
    '..krrwrrrrrrrk..',
    '.krrwrrrrrrrrrk.',
    '.krrrrrrrrrrrrk.',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkwwkkkkkkk',
    'kwwwwwkwwkwwwwwk',
    '.kwwwwwkkwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '..kwwwwwwwwwwk..',
    '...kkwwwwwwkk...',
    '.....kkkkkk.....',
    '................',
    '................']);
  def('hotspring', [
    '................',
    '....r...r...r...',
    '...r...r...r....',
    '....r...r...r...',
    '...r...r...r....',
    '....r...r...r...',
    '................',
    '..kkkkkkkkkkkk..',
    '.krrrrrrrrrrrrk.',
    '.krrrrrrrrrrrrk.',
    '..krrrrrrrrrrk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
    '................']);
  def('fire', [
    '.......o........',
    '......oo........',
    '.....ooo...o....',
    '....oooo..oo....',
    '...ooyoo.ooo....',
    '...oyyyoooooo...',
    '..ooyyyyoooyoo..',
    '..oyyyyyyoyyyo..',
    '..oyywwyyyyyyo..',
    '..oyywwwyyyyyo..',
    '..ooywwwwyyyoo..',
    '...ooywwwyyoo...',
    '....ooyyyyoo....',
    '.....oooooo.....',
    '................',
    '................']);
  def('mask', [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwkkkwwwwkkkwk.',
    '.kwkKkwwwwkKkwk.',
    '.kwwwwwwwwwwwwk.',
    '..kwwwwkkwwwwk..',
    '..kwkwwwwwwkwk..',
    '...kwkkkkkkwk...',
    '....kwwwwwwk....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................']);
  def('parrot', [
    '................',
    '.....kkkk.......',
    '....krrrrk......',
    '...krrwkrrk.....',
    '...krrrrrrkk....',
    '..kkrrrrryyyk...',
    '..krrrrrrkyyk...',
    '..krrrrrrrkk....',
    '..kbbrrrrrk.....',
    '..kbbbbrrrk.....',
    '...kbbbbbbk.....',
    '...kbbGGbbk.....',
    '....kGGGGk......',
    '....kGkkGk......',
    '.....k..k.......',
    '................']);
  def('paperclip', [
    '................',
    '.....kkkkkk.....',
    '....kllllllk....',
    '...klk....klk...',
    '...klk.kk.klk...',
    '...klk.kl.klk...',
    '...klk.kl.klk...',
    '...klk.kl.klk...',
    '...klk.kl.klk...',
    '...klk.kl.klk...',
    '...klk.kl.klk...',
    '...klkkkl.klk...',
    '...kllllk.klk...',
    '....kkkk..klk...',
    '..........kk....',
    '................']);
  def('image', [
    '................',
    '..kkkkkkkkkkkk..',
    '..kccccccccyck..',
    '..kcccccccyyyk..',
    '..kcccccccccck..',
    '..kcccGcccccck..',
    '..kccGGGccGcck..',
    '..kcGGGGGGGGck..',
    '..kGGeGGGeGGGk..',
    '..kGeeeGeeeGGk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('skull', [
    '................',
    '....kkkkkkk.....',
    '...klllllllk....',
    '..klllllllllk...',
    '..klkkklkkklk...',
    '..klkKklkKklk...',
    '..klkkklkkklk...',
    '..kllllkllllk...',
    '...kllkkkllk....',
    '....klllllk.....',
    '....klkklkk.....',
    '....kkkkkk......',
    '................',
    '................',
    '................',
    '................']);
  def('vr', [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kddddddddddddk.',
    'kdkkkkkddkkkkkdk',
    'kdkccckddkccckdk',
    'kdkcwckddkcwckdk',
    'kdkkkkkddkkkkkdk',
    '.kddddk..kddddk.',
    '..kkkk....kkkk..',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('ff', [
    '................',
    '................',
    '.kk......kk.....',
    '.kGk.....kGk....',
    '.kGGk....kGGk...',
    '.kGGGk...kGGGk..',
    '.kGGGGk..kGGGGk.',
    '.kGGGGGk.kGGGGGk',
    '.kGGGGk..kGGGGk.',
    '.kGGGk...kGGGk..',
    '.kGGk....kGGk...',
    '.kGk.....kGk....',
    '.kk......kk.....',
    '................',
    '................',
    '................']);
  def('stop', [
    '................',
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '.krrrrrrrrrrrrk.',
    '.krwwwwwwwwwwrk.',
    '.krwwwwwwwwwwrk.',
    '.krrrrrrrrrrrrk.',
    '..krrrrrrrrrrk..',
    '...krrrrrrrrk...',
    '....krrrrrrk....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................']);
  def('chinchilla', [
    '................',
    '..kk......kk....',
    '.kgggk..kgggk...',
    '.kglgkkkkglgk...',
    '..kgggggggggk...',
    '..kgkggggkgk....',
    '..kgggggggggk...',
    '..kgggmmggggk...',
    '...kggggggggk...',
    '..kglllllllgk...',
    '..kgllllllllgk..',
    '..kgllllllllgk..',
    '...kgggggggggk.k',
    '....kkkkkkkkkkgk',
    '...............k',
    '................']);
  def('grid', [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.krrkbbkyykGGk..'.replace('..', 'k.'),
    '.krrkbbkyykGGk..'.replace('..', 'k.'),
    '.kkkkkkkkkkkkkk.',
    '.kyykGGkrrkbbk..'.replace('..', 'k.'),
    '.kyykGGkrrkbbk..'.replace('..', 'k.'),
    '.kkkkkkkkkkkkkk.',
    '.kbbkrrkGGkyyk..'.replace('..', 'k.'),
    '.kbbkrrkGGkyyk..'.replace('..', 'k.'),
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('flag', [
    '................',
    '..k.............',
    '..kkkkkkkkkkk...',
    '..krrrrrrrrrk...',
    '..krryrrrrrrk...',
    '..kryyyrrrrrk...',
    '..krryrrrrrrk...',
    '..krrrrrrrrrk...',
    '..kkkkkkkkkkk...',
    '..k.............',
    '..k.............',
    '..k.............',
    '..k.............',
    '.kkk............',
    '................',
    '................']);
  def('shield', [
    '................',
    '...kkkkkkkkkk...',
    '..kccccccccCCk..',
    '..kcwcccccccCk..',
    '..kcwccccccCCk..',
    '..kcccccccccCk..',
    '..kcccccccccCk..',
    '...kccccccccCk..',
    '...kccccccccCk..',
    '....kccccccCk...',
    '.....kccccCk....',
    '......kccCk.....',
    '.......kkk......',
    '................',
    '................',
    '................']);
  def('thumb', [
    '................',
    '......kk........',
    '.....kssk.......',
    '.....kssk.......',
    '....kssk........',
    '.kkkkssskkkkk...',
    '.kbbkssssssssk..',
    '.kbbksssssSSk...',
    '.kbbkssssssssk..',
    '.kbbksssssSSk...',
    '.kbbkssssssssk..',
    '.kbbkssssssSk...',
    '.kkkkkkkkkkk....',
    '................',
    '................',
    '................']);
  def('trophy', [
    '................',
    '..kkkkkkkkkkk...',
    '.kykyyyyyyykyk..',
    'ky.kyywyyyyk.yk.'.replace('.y', 'yy'),
    '.kykyyyyyyykyk..',
    '..kkyyyyyyykk...',
    '....kyyyyyk.....',
    '.....kyyyk......',
    '......kyk.......',
    '......kyk.......',
    '.....kYYYk......',
    '....kkkkkkk.....',
    '....kYYYYYk.....',
    '....kkkkkkk.....',
    '................',
    '................']);
  def('rocket', [
    '.......kk.......',
    '......kwwk......',
    '.....kwwwwk.....',
    '.....kwccwk.....',
    '.....kwccwk.....',
    '.....kwwwwk.....',
    '.....kwwwwk.....',
    '....kkwwwwkk....',
    '...krkwwwwkrk...',
    '...krkwwwwkrk...',
    '...kkkkkkkkkk...',
    '......oyyo......',
    '.....oyyyyo.....',
    '......oyyo......',
    '.......oo.......',
    '................']);
  def('down', [
    '................',
    '..k.............',
    '..kr............',
    '..k.r...........',
    '..k..r..........',
    '..k...r.r.......',
    '..k....r.r......',
    '..k.......r.....',
    '..k........r....',
    '..k.........r.r.',
    '..k..........rr.',
    '..k.........rrr.',
    '..kkkkkkkkkkkkk.',
    '................',
    '................',
    '................']);
  def('up', [
    '................',
    '..k.........GGG.',
    '..k..........GG.',
    '..k.........G.G.',
    '..k........G....',
    '..k.......G.....',
    '..k....G.G......',
    '..k...G.G.......',
    '..k..G..........',
    '..k.G...........',
    '..kG............',
    '..k.............',
    '..kkkkkkkkkkkkk.',
    '................',
    '................',
    '................']);
  def('wall', [
    '................',
    'kkkkkkkkkkkkkkkk',
    'kOOOkOOOOkOOOOOk',
    'kOOOkOOOOkOOOOOk',
    'kkkkkkkkkkkkkkkk',
    'kOOOOOkOOOOkOOOk',
    'kOOOOOkOOOOkOOOk',
    'kkkkkkkkkkkkkkkk',
    'kOOOkOOOOkOOOOOk',
    'kOOOkOOOOkOOOOOk',
    'kkkkkkkkkkkkkkkk',
    'kOOOOOkOOOOkOOOk',
    'kOOOOOkOOOOkOOOk',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................']);
  def('numbers', [
    '................',
    '.www....www.www.',
    'w...w..w...w...w',
    'w...w..w...w...w',
    '.wwww...wwww.www'.slice(0, 16),
    '....w......w...w',
    '....w......w...w',
    '.www..w..www.www',
    '................',
    '..r.........r...',
    '...r.......r....',
    '....r.....r.....',
    '.....r...r......',
    '......r.r.......',
    '.......r........',
    '................']);
  def('pizza', [
    '................',
    '.kkkkkkkkkkkkkk.',
    'knnnnnnnnnnnnnnk',
    '.kyyyryyyyyryyk.',
    '..kyyyyyrryyyk..',
    '..kyrryyyyyyyk..',
    '...kyyyyyryyk...',
    '...kyyrryyyyk...',
    '....kyyyyyyk....',
    '....kcyyyyyk....',
    '.....kcyyck.....',
    '.....kccyck.....',
    '......kcck......',
    '......kkkk......',
    '................',
    '................']);
  def('magnifier', [
    '................',
    '....kkkkk.......',
    '...kcccwck......',
    '..kcccccwck.....',
    '..kcccccccck....',
    '..kcccccccck....',
    '..kcccccccck....',
    '...kcccccck.....',
    '....kkkkkkk.....',
    '.........knk....',
    '..........knk...',
    '...........knk..',
    '............knk.',
    '.............kk.',
    '................',
    '................']);
  def('dash', [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('chess', [
    '................',
    '.......k........',
    '......kwk.......',
    '.....kwwwk......',
    '......kwk.......',
    '.....kwwwk......',
    '....kwwwwwk.....',
    '....kwwwwwk.....',
    '.....kwwwk......',
    '.....kwwwk......',
    '....kwwwwwk.....',
    '...kwwwwwwwk....',
    '...kkkkkkkkk....',
    '................',
    '................',
    '................']);
  def('arrow', [
    '................',
    '..k.............',
    '..k.......c.....',
    '..k......cc.....',
    '..k.....ccccccc.',
    '..k......cc.....',
    '..k.......c.....',
    '..k.............',
    '..k...m.........',
    '..k....m........',
    '..k.....m.......',
    '..k......m......',
    '..kkkkkkkkkkkkk.',
    '................',
    '................',
    '................']);
  def('coin', [
    '................',
    '.....kkkkkk.....',
    '...kkyyyyyykk...',
    '..kyywyyyyyyYk..',
    '..kywyyykyyyYk..',
    '.kyyyykkkkyyyYk.',
    '.kyyyykyyyyyyYk.',
    '.kyyyykkkkyyyYk.',
    '.kyyyyyyykyyyYk.',
    '.kyyyykkkkyyyYk.',
    '..kyyyykyyyyYk..',
    '..kYyyyyyyyYYk..',
    '...kkYYYYYYkk...',
    '.....kkkkkk.....',
    '................',
    '................']);
  def('crate', [
    '................',
    '..kkkkkkkkkkkk..',
    '.knnnnnnnnnnnnk.',
    '.knNNNNNNNNNNnk.',
    '.knNpppppppNNnk.',
    '.knNpyyyyypNNnk.',
    '.kkkkkkkkkkkkkk.',
    '.knnnnkyykknnnk.'.replace('kkn', 'knn'),
    '.knNNNkyykNNNnk.',
    '.knNNNNkkNNNNnk.',
    '.knNNNNNNNNNNnk.',
    '.knnnnnnnnnnnnk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................']);
  def('chat', [
    '................',
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwwk.',
    '.kwwkkwwkkwwkwk.'.replace('kwk.', 'wwk.'),
    '.kwwwwwwwwwwwwk.',
    '.kwwkkkkkkwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '..kkkkwkkkkkkk..',
    '.....kwk........',
    '.....kk.........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('building', [
    '................',
    '....kkkkkkk.....',
    '....kbbbbbk.....',
    '....kbcbcbk.....',
    '....kbbbbbkkkk..',
    '.kkkkbcbcbkbbk..',
    '.kbbkbbbbbkcbk..',
    '.kcbkbcbcbkbbk..',
    '.kbbkbbbbbkcbk..',
    '.kcbkbcbcbkbbk..',
    '.kbbkbbbbbkcbk..',
    '.kbbkbbkbbkbbk..',
    '.kkkkkkkkkkkkk..',
    '................',
    '................',
    '................']);
  def('wave', [
    '................',
    '................',
    '.......c........',
    '.......c........',
    '...c...c...c....',
    '...c..ccc..c....',
    '.c.c..ccc..c.c..',
    '.ccc.ccccc.ccc..',
    '.c.c..ccc..c.c..',
    '...c..ccc..c....',
    '...c...c...c....',
    '.......c........',
    '.......c........',
    '................',
    '................',
    '................']);
  def('crown', [
    '................',
    '................',
    '................',
    '.k....k....k....',
    'kyk..kyk..kyk...',
    'kyyk.kyk.kyyk...',
    'kyyykkyykkyyyk..',
    'kyyyyyyyyyyyyk..',
    'kyryyyGyyyyryk..',
    'kyyyyyyyyyyyyk..',
    'kkkkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................',
    '................']);
  def('flask', [
    '................',
    '.....kkkkk......',
    '......kwk.......',
    '......kwk.......',
    '......kwk.......',
    '.....kwwwk......',
    '....kwwwwwk.....',
    '...kwwGGGwwk....',
    '..kwGGGwGGGwk...',
    '..kGGGGGGGGGk...',
    '..kGwGGGGwGGk...',
    '..kGGGGGGGGGk...',
    '...kkkkkkkkk....',
    '................',
    '................',
    '................']);
  // lab logos
  def('spark', [
    '................',
    '.......o........',
    '.......o........',
    '..o....o....o...',
    '...o...o...o....',
    '....o..o..o.....',
    '.....o.o.o......',
    'ooooooooooooooo.',
    '.....o.o.o......',
    '....o..o..o.....',
    '...o...o...o....',
    '..o....o....o...',
    '.......o........',
    '.......o........',
    '................',
    '................']);
  def('knot', [
    '................',
    '.....kkkkk......',
    '....kGGGGGk.....',
    '...kGk...kGkk...',
    '..kGk.kkk.kGGk..',
    '..kGkkGGGk.kGk..',
    '..kGkGk.kGkkGk..',
    '..kGkGk.kGkGk...',
    '..kGGk.kkGkGk...',
    '...kGk.kGGkGk...',
    '...kkGkkkkGk....',
    '.....kGGGGk.....',
    '......kkkk......',
    '................',
    '................',
    '................']);
  def('gem', [
    '................',
    '................',
    '....kkkkkkk.....',
    '...kbwbbbcbk....',
    '..kbwbbbbcccbk..'.slice(0, 16),
    '.kkkkkkkkkkkkk..',
    '..kbbbbbbbcck...',
    '...kbbbbbcck....',
    '....kbbbbck.....',
    '.....kbbck......',
    '......kck.......',
    '.......k........',
    '................',
    '................',
    '................',
    '................']);
  def('x', [
    '................',
    '................',
    '..kk.......kk...',
    '..kwk.....kwk...',
    '...kwk...kwk....',
    '....kwk.kwk.....',
    '.....kwkwk......',
    '......kwk.......',
    '.....kwkwk......',
    '....kwk.kwk.....',
    '...kwk...kwk....',
    '..kwk.....kwk...',
    '..kk.......kk...',
    '................',
    '................',
    '................']);
  def('wind', [
    '................',
    '................',
    '..oooooooooo....',
    '...........oo...',
    '..........oo....',
    '.yyyyyyyy.......',
    '.........yy.....',
    '.rrrrrrrrrrrrr..',
    '..............r.',
    '.........rrrrr..',
    '..mmmmmm........',
    '........mm......',
    '.......mm.......',
    '................',
    '................',
    '................']);
  def('drop_default', [
    '................',
    '.....kkkkkk.....',
    '...kkppppppkk...',
    '..kppwppppppPk..',
    '..kpwppppppPPk..',
    '.kppppp?ppppPPk.'.replace('?', 'p'),
    '.kpppppppppPPPk.',
    '.kpppppppppPPPk.',
    '.kppppppppPPPPk.',
    '..kppppppPPPPk..',
    '..kPpppPPPPPPk..',
    '...kkPPPPPPkk...',
    '.....kkkkkk.....',
    '................',
    '................',
    '................']);

  S.crate.tintKeys = 'py';
  S.person.tintKeys = 'bB';
  S.crowd.tintKeys = 'bm';
  S.gear.tintKeys = 'g';
  // rows sanity: pad/trim to 16
  for (const k in S) S[k].rows = S[k].rows.map((r) => (r.length >= 16 ? r.slice(0, 16) : r.padEnd(16, '.')));

  /* ---------------------------------------------------------------- render cache */
  const cache = new Map();
  function makeCanvas(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  function render(name, scale, tint) {
    scale = scale || 1;
    const key = name + '|' + scale + '|' + (tint || '');
    if (cache.has(key)) return cache.get(key);
    const sp = S[name] || S.drop_default;
    const c = makeCanvas(16 * scale, 16 * scale);
    if (!c) return null;
    const x = c.getContext('2d');
    for (let j = 0; j < 16; j++) {
      const row = sp.rows[j];
      for (let i = 0; i < 16; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        let col = (sp.pal && sp.pal[ch]) || PAL[ch];
        if (!col) continue;
        if (tint && (ch === 'g' || ch === 'd' || ch === 'l' || (sp.tintKeys && sp.tintKeys.includes(ch)))) col = shade(tint, ch === 'd' || ch === 'B' || ch === 'P' ? -0.35 : ch === 'l' || ch === 'y' ? 0.35 : 0);
        x.fillStyle = col;
        x.fillRect(i * scale, j * scale, scale, scale);
      }
    }
    cache.set(key, c);
    return c;
  }
  function shade(hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  /* ---------------------------------------------------------------- portraits (24x24) */
  function portrait(o, scale) {
    scale = scale || 1;
    const key = 'P|' + JSON.stringify(o) + '|' + scale;
    if (cache.has(key)) return cache.get(key);
    const W = 24;
    const c = makeCanvas(W * scale, W * scale);
    if (!c) return null;
    const x = c.getContext('2d');
    const px = (i, j, col) => { x.fillStyle = col; x.fillRect(i * scale, j * scale, scale, scale); };
    const rect = (i, j, w, h, col) => { x.fillStyle = col; x.fillRect(i * scale, j * scale, w * scale, h * scale); };
    const skin = o.skin || '#f2c9a5', skinD = shade(skin, -0.25), hair = o.hc || '#3a2a20', shirt = o.shirt || '#333344';
    const K = '#0b0a1a';
    // shoulders / body
    rect(3, 19, 18, 5, K);
    rect(4, 18, 16, 6, shirt);
    rect(4, 18, 16, 1, shade(shirt, 0.2));
    if (o.extra === 'jacket') {
      rect(4, 18, 16, 6, '#151515');
      rect(6, 19, 2, 4, '#3a3a3a');
      rect(16, 19, 2, 4, '#3a3a3a');
      rect(10, 18, 4, 3, '#e8e8e8');
    }
    if (o.extra === 'tie') { rect(11, 18, 2, 5, '#b3203f'); }
    if (o.extra === 'chain') { for (let i = 8; i < 16; i++) px(i, 19 + ((i % 2) ? 1 : 0), '#ffd24a'); }
    if (o.extra === 'medal') { rect(11, 19, 2, 2, '#ffd24a'); px(11, 21, '#c9a227'); px(12, 21, '#c9a227'); }
    if (o.extra === 'mic') { rect(18, 15, 3, 3, '#444'); rect(19, 18, 1, 5, '#222'); }
    // neck
    rect(10, 16, 4, 3, skinD);
    // head
    rect(7, 5, 10, 12, K);
    rect(6, 7, 12, 8, K);
    rect(8, 6, 8, 10, skin);
    rect(7, 8, 10, 6, skin);
    rect(8, 15, 8, 1, skin);
    // ears
    rect(6, 10, 1, 3, skin);
    rect(17, 10, 1, 3, skin);
    // shading
    rect(15, 8, 1, 7, skinD);
    // eyes
    rect(9, 10, 2, 2, '#ffffff');
    rect(13, 10, 2, 2, '#ffffff');
    px(10, 11, K);
    px(14, 11, K);
    // brows
    rect(9, 9, 2, 1, shade(hair, -0.2));
    rect(13, 9, 2, 1, shade(hair, -0.2));
    // nose + mouth
    px(12, 12, skinD);
    rect(10, 14, 4, 1, '#a0504a');
    // hair
    switch (o.hair) {
      case 'bald':
        rect(7, 7, 1, 4, hair);
        rect(16, 7, 1, 4, hair);
        px(8, 6, shade(skin, 0.2));
        break;
      case 'white':
      case 'short':
        rect(7, 4, 10, 3, hair);
        rect(6, 5, 12, 2, hair);
        rect(7, 7, 1, 3, hair);
        rect(16, 7, 1, 3, hair);
        rect(8, 7, 3, 1, hair);
        px(9, 4, shade(hair, 0.25));
        break;
      case 'curly':
        for (let i = 6; i <= 17; i++) for (let j = 3; j <= 7; j++) if ((i + j) % 2 === 0 || j > 4) rect(i, j, 1, 1, (i + j) % 3 === 0 ? shade(hair, 0.2) : hair);
        rect(6, 8, 1, 3, hair);
        rect(17, 8, 1, 3, hair);
        break;
      case 'long':
        rect(7, 4, 10, 3, hair);
        rect(6, 5, 12, 3, hair);
        rect(5, 7, 2, 11, hair);
        rect(17, 7, 2, 11, hair);
        px(9, 4, shade(hair, 0.25));
        break;
      default:
        rect(7, 4, 10, 3, hair);
    }
    if (o.extra === 'glasses') {
      rect(8, 9, 4, 1, K); rect(12, 10, 1, 1, K); rect(13, 9, 3, 1, K);
      rect(8, 9, 1, 3, K); rect(11, 9, 1, 3, K); rect(13, 9, 1, 3, K); rect(16, 9, 1, 3, K);
      rect(8, 12, 4, 1, K); rect(13, 12, 4, 1, K);
    }
    if (o.extra === 'beard') { rect(8, 13, 8, 3, hair); rect(10, 14, 4, 1, '#a0504a'); }
    if (o.extra === 'fedora') { rect(5, 5, 14, 1, '#222'); rect(7, 2, 10, 3, '#333'); rect(7, 4, 10, 1, '#8a2020'); }
    if (o.extra === 'glow') {
      x.globalCompositeOperation = 'destination-over';
      x.fillStyle = 'rgba(255,255,255,0.18)';
      x.beginPath();
      x.arc(12 * scale, 11 * scale, 11 * scale, 0, Math.PI * 2);
      x.fill();
      x.globalCompositeOperation = 'source-over';
    }
    cache.set(key, c);
    return c;
  }

  /** card art canvas (square) */
  function cardArt(card, size) {
    size = size || 64;
    if (card.art && typeof card.art === 'object' && card.art.portrait) {
      const sc = Math.max(1, Math.floor(size / 24));
      return portrait(card.art.portrait, sc);
    }
    const sc = Math.max(1, Math.floor(size / 16));
    return render(card.art || 'drop_default', sc);
  }

  const urlCache = new Map();
  function url(name, scale, tint) {
    const key = name + '|' + scale + '|' + (tint || '');
    if (urlCache.has(key)) return urlCache.get(key);
    const c = render(name, scale || 2, tint);
    const u = c ? c.toDataURL() : '';
    urlCache.set(key, u);
    return u;
  }
  function cardUrl(card, size) {
    const key = 'card|' + card.id + '|' + size;
    if (urlCache.has(key)) return urlCache.get(key);
    const c = cardArt(card, size);
    const u = c ? c.toDataURL() : '';
    urlCache.set(key, u);
    return u;
  }

  G.Sprites = { PAL, S, render, portrait, cardArt, url, cardUrl, shade, names: () => Object.keys(S) };
})(typeof window !== 'undefined' ? window : globalThis);
