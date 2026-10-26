/** Scalable, branded dining-table mascot. Inline vectors stay crisp on retina and desktop. */
const expressions = [
  {eyes:'open',mouth:'happy',brow:'raised'},
  {eyes:'side',mouth:'smile',brow:'curious'},
  {eyes:'open',mouth:'smile',brow:'raised'},
  {eyes:'serious',mouth:'small',brow:'soft'},
  {eyes:'wink',mouth:'happy',brow:'raised'},
  {eyes:'open',mouth:'happy',brow:'raised'},
  {eyes:'side',mouth:'small',brow:'curious'},
  {eyes:'open',mouth:'happy',brow:'raised'},
  {eyes:'closed',mouth:'happy',brow:'raised'},
];
const moods = [
 'Масата посреща с чиния и вилица',
 'Масата е любопитна какво искаш да готвиш',
 'Масата е готова за различни вкусове',
 'Масата слуша внимателно за ограниченията',
 'Масата намига с готварска шапка',
 'Масата подготвя място за всички',
 'Масата проверява пазарския списък',
 'Масата сервира твоите рецепти',
 'Масата празнува готовото меню',
];
const prop = (mood) => {
 switch(mood){
 case 0: return '<path d="M373 48l-12 28m-25-19 10 24" stroke="#E9B470" stroke-width="9" stroke-linecap="round"/>';
 case 1: return '<g transform="translate(370 38)"><path d="M0 20a21 21 0 1 1 29 19l-4 10H7l-4-10A21 21 0 0 1 0 20Z" fill="#FFE6A7" stroke="#DDA448" stroke-width="3"/><path d="M11 58h15" stroke="#DDA448" stroke-width="5" stroke-linecap="round"/></g>';
 case 2: return '<path d="M370 40q-19 9-14 33 24-5 23-31-6 14-18 24m15-16q19-12 33 3-15 19-31 12" fill="#93B88B" stroke="#517E5C" stroke-width="3"/>';
 case 3: return '<g transform="translate(354 28) rotate(9)"><rect x="0" y="0" width="50" height="58" rx="8" fill="#fff" stroke="#D9DED9" stroke-width="3"/><path d="m9 18 6 6 10-13m-16 25h31m-31 8h23" stroke="#0C563A" fill="none" stroke-width="4" stroke-linecap="round"/></g>';
 case 4: return '<g transform="translate(206 3)"><path d="M-50 43c-25-23-11-55 15-44 10-25 46-24 57-3 28-14 43 14 29 35l-8 24H-45Z" fill="#fff" stroke="#EEE1CC" stroke-width="3"/><path d="M-47 43h90v19h-90z" rx="5" fill="#FFFAF1" stroke="#EEE1CC" stroke-width="3"/></g>';
 case 5: return '<g opacity=".95"><ellipse cx="138" cy="112" rx="35" ry="13" fill="#D69A5F"/><ellipse cx="138" cy="107" rx="35" ry="13" fill="#fff"/><ellipse cx="138" cy="107" rx="23" ry="6" fill="#F4ECE1"/></g>';
 case 6: return '<g transform="translate(360 20) rotate(8)"><path d="M8 20h58l-6 55H14Z" fill="#F6E7C5" stroke="#DDA96D" stroke-width="4"/><path d="M24 20v-9c0-17 25-17 25 0v9" fill="none" stroke="#DDA96D" stroke-width="5"/><path d="m25 47 9 9 16-18" fill="none" stroke="#00603E" stroke-width="5" stroke-linecap="round"/></g>';
 case 7: return '<g transform="translate(350 26) rotate(7)"><rect width="69" height="55" rx="8" fill="#FFFDF7" stroke="#D9DCCF" stroke-width="3"/><path d="M12 13h43M12 25h37M12 37h25" stroke="#E6B175" stroke-width="5" stroke-linecap="round"/></g>';
 case 8: return '<g fill="#E5AB60"><path d="m111 33 8 15-8 15-8-15z"/><path d="m375 25 8 15-8 15-8-15z"/><circle cx="409" cy="85" r="6"/><circle cx="85" cy="93" r="5"/></g>';
 default:return '';
 }
};
/**
 * SVG deliberately keeps the approved table silhouette (oval wood, four legs,
 * two big eyes, white plate and fork), without using the blurred 192px atlas.
 */
export function mascotArt(mood=0,className=''){
 const m=Math.max(0,Math.min(8,Number(mood)||0));
 const e=expressions[m],pupil=e.eyes==='side'?10:0;
 const eye=(x)=>e.eyes==='closed'
    ? '<path d="M'+(x-20)+' 234q20 22 40 0" stroke="#3C2418" fill="none" stroke-width="7" stroke-linecap="round"/>'
    : e.eyes==='wink'&&x===294
    ? '<path d="M270 235q24 16 46-2" stroke="#3C2418" fill="none" stroke-width="7" stroke-linecap="round"/>'
    : '<ellipse cx="'+x+'" cy="244" rx="30" ry="37" fill="#fff"/><ellipse cx="'+(x+pupil+3)+'" cy="249" rx="16" ry="24" fill="#251714"/><circle cx="'+(x+pupil-2)+'" cy="240" r="6" fill="#fff"/>';
 const mouth=e.mouth==='small'
    ? '<path d="M236 292q14 6 28 0" fill="none" stroke="#5A2A1B" stroke-width="6" stroke-linecap="round"/>'
    : e.mouth==='smile'
    ? '<path d="M227 283q23 26 48 0" fill="none" stroke="#5A2A1B" stroke-width="7" stroke-linecap="round"/>'
    : '<path d="M225 279q25 42 52 1q-26-1-52-1Z" fill="#512218"/><path d="M240 307q11-10 21-4" stroke="#EA8C75" stroke-width="7" stroke-linecap="round"/>';
 const topGlow=m===8?'#FFD397':'#F8C385';
 return '<svg class="nm-mascot nm-mood-'+m+' '+className+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 370" role="img" aria-label="'+moods[m]+'" focusable="false">'
 +'<defs><linearGradient id="nm-wood-'+m+'" x1="0" x2="0" y1="0" y2="1"><stop stop-color="'+topGlow+'"/><stop offset="1" stop-color="#E5A263"/></linearGradient><linearGradient id="nm-legs-'+m+'" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="#F6C085"/><stop offset="1" stop-color="#D88C4C"/></linearGradient></defs>'
 +'<ellipse cx="260" cy="341" rx="196" ry="15" fill="#0B4631" opacity=".075"/>'
 +'<path d="M166 183q-11 54-26 129-4 25-24 23-18-2-14-25l14-113Z" fill="#9E592B"/>'
 +'<path d="M350 183q11 54 26 129 4 25 24 23 18-2 14-25l-14-113Z" fill="#9E592B"/>'
 +'<path d="M147 200 105 335q-7 20-26 14-15-6-9-27l41-142Z" fill="url(#nm-legs-'+m+')"/>'
 +'<path d="m372 200 43 135q7 20 26 14 15-6 9-27l-41-142Z" fill="url(#nm-legs-'+m+')"/>'
 +'<path d="M149 190Q165 318 260 318q100 0 112-128Z" fill="#D59152"/>'
 +'<path d="M166 210q20 106 94 106 70 0 91-106" fill="#E6A666" opacity=".55"/>'
 +'<ellipse cx="260" cy="199" rx="209" ry="65" fill="#D6904E"/>'
 +'<ellipse cx="260" cy="173" rx="209" ry="66" fill="url(#nm-wood-'+m+')"/>'
 +'<path d="M75 150q176-31 362 1M83 192q181-28 359-4M101 214q164-22 320-6" stroke="#D98D4B" stroke-width="6" opacity=".35" fill="none" stroke-linecap="round"/>'
 +'<ellipse cx="374" cy="161" rx="56" ry="22" fill="#C27C42" opacity=".48"/>'
 +'<ellipse cx="372" cy="149" rx="57" ry="22" fill="#FFFFFF"/><ellipse cx="372" cy="146" rx="37" ry="12" fill="#F1EAE1"/>'
 +'<g transform="translate(122 174) rotate(-16)"><path d="M-40 10h62" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/><path d="M19 10V-18m8 28v-29m8 30v-27m-18 30h20" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/></g>'
 +prop(m)
 +'<path d="M174 217q22-15 40-2M276 212q21-12 38 2" stroke="#52301D" stroke-width="8" fill="none" stroke-linecap="round" opacity="'+(e.brow==='soft'?.75:1)+'"/>'
 +eye(207)+eye(295)
 +mouth
 +'</svg>';
}
