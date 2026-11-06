import { esc } from './ui.js';
/** A small preview of the meal-planning object, rather than an unrelated mascot. */
export function mascotArt(mood=0,className='') {
 const days=['Пон','Вто','Сря'];
 const meals=[['Леща със зеленчуци','40 мин · един съд'],['Паста с доматен сос','20 мин · лесна вечеря'],['Омлет със спанак','15 мин · бърза идея']];
 return `<div class="edish-preview ${esc(className)}"><p>Примерна седмица с eDish</p><h3>Вечерите са подредени.</h3>${meals.map(([name,meta],i)=>`<div class="edish-preview-row"><span>${days[i]}</span><div><strong>${name}</strong><small>${meta}</small></div><span class="edish-preview-check">✓</span></div>`).join('')}<div class="edish-preview-bottom"><strong>Един списък за покупки</strong><span>По твоя вкус</span></div></div>`;
}
