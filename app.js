/* hcj & ee · Shared views and interactions. Content is a static, dated travel plan. */
(() => {
 'use strict';
 const D = window.TRIP;
 const $ = (s, root = document) => root.querySelector(s);
 const $$ = (s, root = document) => [...root.querySelectorAll(s)];
 const escape = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icons = {
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', external:'<path d="M14 4h6v6M20 4 10 14M10 5H5v14h14v-5"/>', down:'<path d="m6 9 6 6 6-6"/>', left:'<path d="m15 6-6 6 6 6"/>', right:'<path d="m9 6 6 6-6 6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', moon:'<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>', menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', play:'<path d="m8 5 11 7-11 7V5Z"/>', pause:'<path d="M8 5v14M16 5v14"/>', train:'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 10h14M8 21l2-3m4 0 2 3M8 14h1m6 0h1"/>', pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>', calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>', check:'<path d="m5 12 4 4L19 6"/>', bath:'<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3Zm2 8-1 2m15-2 1 2M6 12V5a2 2 0 0 1 4 0"/>', copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'
 };
 const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
 const routes = {home:'首页',itinerary:'行程',food:'美食',hotels:'酒店',map:'地图',our:'Our Hokkaido',transport:'交通与票务',shopping:'逛街清单',prepare:'行李准备'};
 const state = {person:null, route:'home', date:21, week:21, filter:'all', city:'小樽', foodSelected:0, phase:'行前', transport:'manual', mm:null, toastTimer:null,offlineReady:false};
 const audio = $('#audio');
 let userPaused=false;
 let autoplayPending=true;
 let playRequest=null;
 let storageAvailable = true;
 const getStored = (key, fallback = null) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch {return fallback;} };
 const setStored = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { storageAvailable=false;return false; } };
 audio.volume = .45;
 function mapLink(place) { return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place); }
 function transitLink(origin, destination) {return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(destination)+'&travelmode=transit';}
 function external(url, label, cls = 'text-button') { return `<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}${icon('external')}</a>`; }
 function docButton(id, label='查看完整说明', cls='text-button') { return `<button class="${cls}" data-doc="${id}">${escape(label)}${icon('arrow')}</button>`; }
 function dayData() {return D.days.find(d=>d.date===state.date) || D.days[2];}
 function todayJST() {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 function tripToday() {const iso=todayJST();const n=Number(iso.slice(-2));return iso.startsWith('2026-12-') && n>=19 && n<=27 ? n : null;}
 function toast(message) {clearTimeout(state.toastTimer);const el=$('#toast');el.textContent=message;el.classList.add('visible');state.toastTimer=setTimeout(()=>el.classList.remove('visible'),4200);}
 const pageTitleArt={"地图": {"file": "map", "width": 536, "height": 241}, "行程日历": {"file": "itinerary", "width": 1072, "height": 254}, "美食": {"file": "food", "width": 440, "height": 327}, "酒店": {"file": "hotels", "width": 532, "height": 256}, "交通与票务": {"file": "transport", "width": 1277, "height": 316}, "逛街清单": {"file": "shopping", "width": 1045, "height": 295}, "行李准备": {"file": "prepare", "width": 1051, "height": 289}};
 function heading(title, description, actions='') {const art=pageTitleArt[title];const titleContent=art?`<img class="page-title-art" src="assets/title-${art.file}.webp" alt="${escape(title)}" width="${art.width}" height="${art.height}">`:escape(title);return `<div class="page-heading"><div><h1>${titleContent}</h1><p>${description}</p></div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;}
 function note(text, warning=false) {return `<div class="notice ${warning?'warning':''}">${icon('info')}<p>${text}</p></div>`;}
 function sourceNote() {return `<p class="source-note">资料整理于 ${D.updated} · 时间为行程目标，冬季交通与临休见对应展开说明。</p>`;}
 function homeView() {
  return `<div class="hero-shell"><section class="hero" aria-labelledby="home-title"><img class="hero-image" src="assets/home-cover.webp" alt="蓝色雪原上，三个小角色站在左侧，右侧是一棵孤树" width="1672" height="941" fetchpriority="high"><div class="hero-copy"><h1 id="home-title"><img class="hero-title-art" src="assets/hero-title.webp" alt="北海道之旅" width="1222" height="321"></h1><p class="hero-date">2026.12.20 — 12.27</p><a class="hero-action" href="#/itinerary">查看行程 ${icon('arrow')}</a></div></section></div>
   <section class="home-journey" id="journey"><div class="journey-heading"><h2>行程概览</h2><p>12月20—27日 · 小樽 / 旭川 / 札幌</p></div><div class="city-rail">
   <article class="city-stop"><img class="city-overview-art" src="assets/day-21.webp" alt="" width="120" height="120"><span class="city-date">12.20 — 12.22</span><h3>小樽</h3><p>天狗山、钱函、南樽市场、堺町通。</p></article>
   <article class="city-stop"><img class="city-overview-art" src="assets/day-22.webp" alt="" width="120" height="120"><span class="city-date">12.22 — 12.24</span><h3>旭川</h3><p>白须瀑布、旭山动物园、SWITCH FLAVOR。</p></article>
   <article class="city-stop"><img class="city-overview-art" src="assets/day-24.webp" alt="" width="120" height="120"><span class="city-date">12.24 — 12.27</span><h3>札幌</h3><p>圣诞集市、神宫、白色恋人公园与购物。</p></article></div><div class="home-actions"><a class="button" href="#/itinerary">打开行程日历 ${icon('calendar')}</a><a class="button secondary" href="#/prepare">行李准备</a>${tripToday()?`<button class="button secondary" data-select-day="${tripToday()}">查看今天</button>`:''}<span class="home-note">另含12.19上海集合日 · 8天7晚北海道</span></div></section>`;
 }
 const ourStoryParagraphs=[
 '冬天的北海道，总有一种让人期待的魔力。',
 '白雪覆盖的街道、缓缓行驶的列车、温暖的街边小店，还有圣诞节闪烁的灯光。这一次，我们决定一起走进北海道的冬天，收藏属于我们的冬日回忆。',
 '旅程从小樽开始。沿着浪漫的运河散步，登上天狗山欣赏雪景，在海边的小站停留，逛逛充满童话气息的街道。',
 '随后前往旭川，寻找美瑛的蓝色瀑布，去旭山动物园看企鹅在雪地里散步，再用一份热腾腾的旭川拉面和精致的夜芭菲结束一天。',
 '最后来到札幌，在平安夜与圣诞节期间，感受北海道最热闹也最温柔的冬日氛围。逛圣诞集市、参拜北海道神宫、看白色恋人公园的灯光，再一起寻找喜欢的美食与小店。',
 '这趟旅行不需要每一分钟都安排得满满当当。比起赶着完成所有景点，我们更希望在喜欢的地方多停留一会儿，慢慢感受雪、城市、美食，以及彼此的陪伴。',
 '两个人，三座城市，八天七晚。',
 '希望多年以后再翻开这份旅行记录，我们依然能想起，2026年的圣诞节，曾经一起走过北海道的冬天。'
 ];
 function ourHokkaidoView(){return `<article class="our-hokkaido"><header class="our-story-hero"><img class="our-story-photo" src="assets/our-hokkaido-cover.webp" alt="蓝色拼贴天空下的小樽运河，积雪的仓库、灯光和沿岸行人映在冬日水面" width="1686" height="933" fetchpriority="high"><div class="our-story-fade" aria-hidden="true"></div><div class="our-story-title-wrap"><h1><img class="our-story-title" src="assets/our-hokkaido-title.webp" alt="关于这趟旅程" width="1559" height="289"></h1></div></header><div class="our-story-body">${ourStoryParagraphs.map((p,i)=>`<p class="${i===0?'our-story-opening':i===6?'our-story-keepsake':''}"><strong>${escape(p)}</strong></p>`).join('')}<p class="our-story-signoff" lang="en"><strong><em>Our little winter story, written in Hokkaido.</em></strong></p></div></article>`;}
 function renderCalendar() {
  const today=tripToday();
  return `<section class="calendar glass" aria-label="2026年12月旅行周历"><div class="calendar-toolbar"><div class="month-title">2026年12月<span>旅行日历</span></div><div class="week-controls"><button class="icon-button" data-week="14" aria-label="上一周，12月14至20日" ${state.week===14?'disabled':''}>${icon('left')}</button><span class="week-range">12.${state.week} — 12.${state.week+6}</span><button class="icon-button" data-week="21" aria-label="下一周，12月21至27日" ${state.week===21?'disabled':''}>${icon('right')}</button></div></div><div class="weekdays" aria-hidden="true">${['一','二','三','四','五','六','日'].map(s=>`<span>周${s}</span>`).join('')}</div><div class="calendar-grid">${Array.from({length:7},(_,i)=>{
   const n=state.week+i,d=D.days.find(x=>x.date===n);return `<button class="calendar-day ${!d?'outside':''}" ${!d?'disabled':`data-day="${n}" aria-pressed="${state.date===n}"`} aria-label="12月${n}日${d?'，'+escape(d.city)+'，'+escape(d.title):'，旅行前'}"><span class="day-num">${n}${n===today?'<span class="today-dot"></span>':''}</span><span class="day-city">${d?escape(d.city.split(' / ')[0]):'—'}</span>${d?`<img class="calendar-day-art" src="assets/day-${n}.webp" alt="" width="80" height="80">`:''}</button>`;
  }).join('')}</div><div class="calendar-foot"><span>点选日期，查看下方安排 · 北海道段为日本时间</span><button class="text-button" data-day="19">上海集合 / 抵达日 ${icon('left')}</button>${today?`<button class="text-button" data-day="${today}">今天</button>`:''}</div></section>`;
 }
 const kindLabels={transport:'交通',food:'吃喝',sight:'随逛',stay:'酒店',rest:'歇一会儿'};
 function eventCard(event,index) {
  const conditional=event.title.includes('精灵露台');
  return `<article class="timeline-item" id="event-${index}"><div class="time-label">${escape(event.time)}</div><div><div class="event-header"><h3>${escape(event.title)}</h3>${conditional?'<span class="pill warm">条件候选</span>':event.pay?`<span class="pill ${event.pay.includes('覆盖')||event.pay.includes('Pass包')?'success':''}">${escape(event.pay)}</span>`:''}</div><p class="event-summary">${escape(event.summary)}</p><div class="event-actions">${event.detail?`<details class="inline-detail"><summary>展开${event.kind==='transport'?'交通':'安排'}</summary><p>${escape(event.detail)}</p></details>`:''}${event.place?external(mapLink(event.place),'地图导航'):''}${event.alt?`<details class="inline-detail"><summary>查看备选</summary><p>${escape(event.alt)}</p></details>`:''}${event.link?external(event.link,'官网 / 预约'):''}</div></div></article>`;
 }
 function timeline(d,filter='all') {const events=d.events.map((e,i)=>({e,i})).filter(({e})=>filter==='all'||e.kind===filter);return events.length?`<div class="timeline">${events.map(({e,i})=>eventCard(e,i)).join('')}</div>`:'<p class="no-results">这一天没有此类固定安排，可以查看全部行程。</p>';}
 function itineraryView() {
  const d=dayData(),h=D.hotels[d.hotel];
  return `<div class="itinerary-page"><header class="itinerary-hero"><img class="itinerary-cover" src="assets/itinerary-cover.webp" alt="冬日札幌电视塔与雪地街景的蓝色拼贴画" width="1448" height="1086" fetchpriority="high"><div class="our-story-fade" aria-hidden="true"></div><div class="itinerary-hero-copy">${heading('行程日历','按日期查看活动、交通和餐饮。',docButton('section2','全程总览','button secondary'))}</div></header><div class="page itinerary-content">${renderCalendar()}<section class="day-intro-card glass" aria-labelledby="selected-day-title"><button class="day-intro-art-button" data-day-image="${d.date}" aria-label="放大查看12月${d.date}日行程图标"><img class="day-intro-art" src="assets/day-${d.date}.webp" alt="" width="128" height="128"><span class="image-zoom-hint" aria-hidden="true">${icon('search')}</span></button><div><p class="day-label">12月${d.date}日 · Day ${d.day} · ${escape(d.city)}</p><h2 id="selected-day-title">${escape(d.title)}</h2><p class="day-intro-notes">${escape(d.notes)}</p></div>${docButton('day'+d.day,'当日完整手册','button outline')}</section><div class="itinerary-columns"><section aria-labelledby="selected-day-title"><div class="timeline-filters" aria-label="筛选当天事件">${[['all','全部安排'],['transport','交通'],['food','吃喝']].map(([k,l])=>`<button class="filter-button" data-filter="${k}" aria-pressed="${state.filter===k}">${l}</button>`).join('')}</div>${timeline(d,state.filter)}</section><aside class="day-aside"><div class="aside-block"><h3>${d.date===27?'返程前酒店':'当晚酒店'}</h3><p class="hotel-name">${escape(h.name)}</p><p>${escape(h.bath)}</p><p>早餐：${escape(h.breakfast)}</p><div class="aside-buttons">${external(mapLink(h.jp+' '+h.address),'回酒店')}<button class="text-button" data-hotel="${d.hotel}">住宿详情</button></div></div><div class="aside-block"><h3>当天交通</h3><p>查看乘车步骤、Pass覆盖范围与付款方式。</p><a class="text-button" href="#/transport">查交通与票务 ${icon('arrow')}</a></div></aside></div>${sourceNote()}</div></div>`;
 }
 function transportView() {
  const manuals=[['section3','机场一次办好主要JR票','两张4日Pass、22/24日相邻指定席、20/27日机场票；包含Klook与JR网上操作。'],['section10','巴士、缆车和付款例外','天狗山套票、动物园纸票、美瑛现金与完整衔接规则。'],['section5','逐段交通与付款核对表','全程每一段怎么坐、Pass是否覆盖、还要买什么。'],['section12','全部导航入口','按日打开Google Maps，核对正确方向与分店。']];
  let content='';
  if(state.transport==='manual') content=`<div class="manual-list">${manuals.map(([id,t,s])=>`<article class="manual-item"><h3>${t}</h3><p>${s}</p>${docButton(id)}</article>`).join('')}</div><div class="route-chain" aria-label="机场办理路线示意"><span>国际到达</span><b>→</b><span>联络通道</span><b>→</b><span>国内航站楼B1</span><b>→</b><span>JR外籍旅客服务处</span></div>${note('先用12/21–24日Pass办理有效区间内的普通指定席。费用已含，但仍须预约并领取座位票。')}`;
  if(state.transport==='flights') content=`<div class="flight-info-list">${[{label:'去程',date:'2026年12月20日',flight:'9C8791',from:'上海浦东 PVG',to:'札幌新千岁 CTS',departure:'08:20',arrival:'12:50'},{label:'返程',date:'2026年12月27日',flight:'9C8792',from:'札幌新千岁 CTS',to:'上海浦东 PVG',departure:'13:50',arrival:'17:15'}].map(f=>`<article class="flight-info"><p class="day-label">${f.label} · ${f.date}</p><h2>${f.flight}</h2><div class="flight-route"><div><strong>${f.departure}</strong><p>${f.from}</p></div><span aria-hidden="true">${icon('arrow')}</span><div><strong>${f.arrival}</strong><p>${f.to}</p></div></div></article>`).join('')}</div><p class="source-note">以上均为当地时间：中国UTC+8，日本UTC+9。托运行李已购买20kg / 人。</p>`;
  const allTransport=D.days.map(d=>`<section class="transport-day"><h3>12.${d.date} · ${escape(d.city)}</h3>${d.events.filter(e=>e.kind==='transport').map((e,i)=>eventCard(e,i)).join('')||'<p class="muted">随逛为主，详细步行路线见当天手册。</p>'}${docButton('day'+d.day,'当天完整交通')}</section>`).join('');
  const artwork=state.transport==='manual'?`<img class="transport-ticket-image" src="assets/transport-ticket.webp" alt="札幌—富良野区域券：连续4日JR Pass，12月21日至24日，预购参考每人11,000日元；普通指定席仍需划位领票" width="1672" height="940">`:state.transport==='flights'?`<img class="transport-ticket-image transport-flight-image" src="assets/transport-flights.webp" alt="往返航班机票：12月20日9C8791上海浦东08:20至新千岁12:50；12月27日9C8792新千岁13:50至上海浦东17:15" width="1672" height="941">`:'';
  return `<div class="page transport-page">${heading('交通与票务','航班、JR Pass与各路段乘车说明。')}<div class="segments transport-segments" aria-label="交通内容">${[['manual','票务手册'],['flights','航班信息']].map(([k,l])=>`<button data-transport="${k}" aria-pressed="${state.transport===k}">${l}</button>`).join('')}</div>${artwork}<div class="transport-layout"><section>${content}</section></div><section class="all-transport-section" aria-labelledby="all-transport-title"><h2 id="all-transport-title">全程交通</h2>${allTransport}</section>${sourceNote()}</div>`;
 }
 let foodMarkers=new Map();
 function cityFoods(){return D.foods.map((f,i)=>({...f,i})).filter(f=>f.city===state.city);}
 function selectedFood(){return cityFoods().find(f=>f.i===state.foodSelected)||cityFoods()[0];}
 function foodSelectionView(f){return `<div class="food-selection-top"><button class="food-selection-art" data-food-image="${f.i}" aria-label="放大查看${escape(f.type)}图标"><img src="assets/food-${f.art}.webp" alt="" width="86" height="86"></button><div><p class="food-selection-city">${escape(f.city)} · ${escape(f.type)}</p><h2>${escape(f.name)}</h2><p class="food-when">${escape(f.when)}</p></div><div class="food-selection-actions">${external(mapLink(f.address+' '+f.name),'导航到店','button')}<button class="button secondary" data-food="${f.i}">介绍 / 备选 ${icon('arrow')}</button></div></div><div class="food-selection-facts"><p><span>营业参考</span>${escape(f.hours)}</p><p><span>店铺地址</span>${escape(f.address)}</p></div><details class="food-selection-detail"><summary>点单建议与备选</summary><p>${escape(f.order)}</p><p>备选：${escape(f.alt)}</p><div class="detail-actions">${external(f.link,'官方信息 / 预约')}</div></details>${f.i===3?'<p class="source-note">地图定位LeTAO本店；北一Hall为同一逛街路线上的另一个停留点，见餐厅介绍。</p>':''}`;}
 function foodMapHeader(){const list=cityFoods(),f=selectedFood();return `<section class="map-stage food-map-stage" aria-label="餐厅位置地图"><div id="trip-map" role="region" aria-label="可缩放的餐厅地图" tabindex="0"></div><div class="food-map-controls"><div class="map-overlay-label glass"><span>${escape(state.city)} · ${list.length} 家</span><small>点击图标选店 · 细线指向店铺地址</small></div><div class="segments food-city-switch glass" aria-label="按城市查看餐厅">${['小樽','旭川','札幌'].map(c=>`<button data-city="${c}" aria-pressed="${c===state.city}">${c}</button>`).join('')}</div></div><button class="button food-map-reset glass" data-food-map-reset>查看本城全部</button><p id="map-network-status" class="map-network-status" role="status" hidden>底图暂时无法加载；下方餐厅资料与导航仍可使用。</p></section><div class="food-map-content"><p id="food-selection-status" class="sr-only" role="status" aria-live="polite">已选择${escape(f.name)}</p><section id="food-selection" class="food-selection glass" aria-label="当前选择的餐厅">${foodSelectionView(f)}</section>`;}
 function foodMapIcon(f,selected=false){return L.divIcon({className:`food-map-pin ${selected?'is-selected':''}`,html:`<span class="food-pin-image"><img src="assets/food-${f.art}.webp" alt="" width="48" height="48"></span><span class="food-pin-check" aria-hidden="true">✓</span>`,iconSize:[58,58],iconAnchor:[29,29]});}
 let foodLeaderLayer=null;
 function layoutFoodMarkers(){
  if(!tripMap||!foodLeaderLayer)return;foodLeaderLayer.clearLayers();
  const list=cityFoods(),points=list.map(f=>tripMap.latLngToContainerPoint([f.mapPoint.lat,f.mapPoint.lng])),visited=new Set();
  list.forEach((f,i)=>{
   if(visited.has(i))return;const group=[i];visited.add(i);
   for(let k=0;k<group.length;k++)points.forEach((p,j)=>{if(!visited.has(j)&&p.distanceTo(points[group[k]])<76){visited.add(j);group.push(j);}});
   const center=group.reduce((sum,j)=>sum.add(points[j]),L.point(0,0)).divideBy(group.length);
   group.forEach((j,k)=>{
    const item=list[j],real=[item.mapPoint.lat,item.mapPoint.lng];let display=real;
    if(group.length>1){const radius=Math.max(48,group.length*16),angle=-Math.PI/2+k*Math.PI*2/group.length;display=tripMap.containerPointToLatLng(center.add(L.point(Math.cos(angle)*radius,Math.sin(angle)*radius)));L.polyline([real,display],{color:'#526875',weight:1.5,opacity:.8,dashArray:'3 4',interactive:false}).addTo(foodLeaderLayer);L.circleMarker(real,{radius:3,color:'#244b62',weight:1,fillOpacity:1,interactive:false}).addTo(foodLeaderLayer);}
    foodMarkers.get(item.i)?.setLatLng(display);
   });
  });
 }
 function fitFoodMap(){if(tripMap)tripMap.fitBounds(L.latLngBounds(cityFoods().map(f=>[f.mapPoint.lat,f.mapPoint.lng])),{paddingTopLeft:[75,100],paddingBottomRight:[75,60],maxZoom:16,animate:false});layoutFoodMarkers();}
 function selectFood(index,{pan=true}={}){
  const f=cityFoods().find(f=>f.i===index);if(!f)return;const focusedMarker=[...foodMarkers.values()].find(m=>m.getElement()===document.activeElement);state.foodSelected=index;
  $('#food-selection').innerHTML=foodSelectionView(f);$('#food-selection-status').textContent=`已选择${f.name}`;
  $$('[data-food-row]').forEach(row=>row.classList.toggle('is-selected',Number(row.dataset.foodRow)===index));
  $$('[data-food-select]').forEach(b=>{const active=Number(b.dataset.foodSelect)===index;b.setAttribute('aria-pressed',String(active));$('.food-selected-label',b).textContent=active?'已选中':'在地图中选择';});
  foodMarkers.forEach((marker,id)=>{const item=D.foods[id],active=id===index;marker.setIcon(foodMapIcon({...item,i:id},active));const el=marker.getElement();el?.setAttribute('aria-label',`选择${item.name}`);el?.setAttribute('aria-pressed',String(active));marker.setZIndexOffset(active?1000:0);if(active)marker.openTooltip();else marker.closeTooltip();});
  if(tripMap&&pan)tripMap.panInside([f.mapPoint.lat,f.mapPoint.lng],{padding:[75,85],animate:false});
  focusedMarker?.getElement()?.focus({preventScroll:true});
 }
 function initFoodMap(){
  if(!createBaseMap())return;foodMarkers=new Map();foodLeaderLayer=L.layerGroup().addTo(tripMap);tripMap.on('zoomend',layoutFoodMarkers);
  cityFoods().forEach(f=>{const marker=L.marker([f.mapPoint.lat,f.mapPoint.lng],{icon:foodMapIcon(f,f.i===state.foodSelected),title:f.name,keyboard:true,autoPanOnFocus:false}).addTo(tripMap);marker.bindTooltip(escape(f.name),{direction:'top',offset:[0,-27],className:'trip-map-tooltip food-pin-tooltip'});marker.on('click',()=>selectFood(f.i));foodMarkers.set(f.i,marker);});
  fitFoodMap();selectFood(state.foodSelected,{pan:false});
 }
 function foodView() {
  const list=cityFoods();state.foodSelected=selectedFood().i;
  return `<div class="food-map-page"><div class="food-map-heading">${heading('美食','在地图上选择店铺，查看餐厅信息。',docButton('section8','预约与点单手册','button secondary'))}</div>${foodMapHeader()}<p class="food-caption">缩略图为菜系示意，非店铺实拍 · 餐位尚未预约</p><section class="food-list" aria-label="本城餐厅列表">${list.map(f=>`<article class="food-row liquid-panel ${f.i===state.foodSelected?'is-selected':''}" data-food-row="${f.i}"><button class="food-image-button" data-food-image="${f.i}" aria-label="放大查看${escape(f.type)}图标"><img class="food-art" src="assets/food-${f.art}.webp" alt="" width="86" height="86" loading="lazy"><span class="image-zoom-hint" aria-hidden="true">${icon("search")}</span></button><div><h2><button class="food-name-select" data-food-select="${f.i}" aria-pressed="${f.i===state.foodSelected}">${escape(f.name)}<span class="food-selected-label">${f.i===state.foodSelected?'已选中':'在地图中选择'}</span></button></h2><p class="food-meta">${escape(f.type)}</p><p class="food-when">${escape(f.when)}</p><div class="food-row-actions"><button class="text-button" data-food="${f.i}">介绍 / 备选 ${icon('arrow')}</button>${external(mapLink(f.address+' '+f.name),'导航')}</div></div></article>`).join('')}</section><p class="source-note">图标按店铺地址定位；入口与楼层请查看店铺信息和Google Maps。相近图标会展开排列，细线指向店铺地址。</p>${sourceNote()}</div></div>`;
 }
 function hotelsView() {
  const current=tripToday(),index=current?D.days.find(d=>d.date===current)?.hotel:null;
  const hotels=D.hotels.map((h,i)=>({...h,i})).filter(h=>h.i!==0);if(index!==null)hotels.sort((a,b)=>(b.i===index)-(a.i===index));
  return `<div class="page">${heading('酒店','小樽、旭川、札幌的入住信息。')}<section class="hotel-list">${hotels.map(h=>`<article class="hotel-card liquid-panel" aria-labelledby="hotel-title-${h.i}"><div class="hotel-visual"><div class="hotel-art-control"><button class="hotel-art-button" data-hotel-image="${h.i}" aria-label="放大查看${escape(h.name)}酒店图标"><img src="assets/hotel-${h.i}.webp" alt="" width="144" height="144"><span class="image-zoom-hint" aria-hidden="true">${icon('search')}</span></button></div><p class="hotel-city">${h.city}</p><p class="hotel-dates">${h.dates}</p>${h.i===index?'<span class="pill success">今晚酒店</span>':''}</div><div class="hotel-body"><h2 class="hotel-nameplate" id="hotel-title-${h.i}">${escape(h.name)}</h2><p>${escape(h.access)}</p><button class="text-button" data-hotel="${h.i}">展开酒店详情 ${icon('arrow')}</button></div><div class="hotel-facts"><div><span>早餐</span>${escape(h.breakfast)}</div><div><span>退房 / 出发</span>${escape(h.checkout)}</div><div class="hotel-card-actions"><button class="button secondary" data-hotel-map="${h.i}">查看酒店地图 ${icon('pin')}</button>${external(mapLink(h.jp+' '+h.address),'导航到酒店','button secondary')}</div></div><button class="hotel-card-map-trigger" data-hotel-map="${h.i}" aria-label="查看${escape(h.name)}位置地图"></button></article>`).join('')}</section>${docButton('section7','查看完整住宿手册')}${sourceNote()}</div>`;
 }
 let tripMap=null,mapRouteLayer=null,mapTileLayer=null,mapTileReady=false;
 const mapPlaces={
  pudong:['浦东机场',31.145,121.805],shhotel:['浦东机场酒店',31.163,121.772],
  cts:['新千岁机场',42.787,141.681],otaru:['小樽站',43.197,140.993],tengu:['天狗山',43.170,140.972],zenibako:['钱函',43.144,141.160],minami:['南小樽',43.186,141.008],market:['南樽市场',43.180,141.010],sakai:['堺町通',43.192,141.007],canal:['小樽运河',43.201,141.002],
  sapporo:['札幌站',43.068,141.351],asahikawa:['旭川站',43.763,142.358],biei:['美瑛站',43.591,142.461],shiraha:['白须瀑布',43.474,142.639],zoo:['旭山动物园',43.768,142.479],odori:['大通公园',43.060,141.353],parco:['札幌PARCO',43.058,141.353],univ:['北海道大学',43.078,141.340],shrine:['北海道神宫',43.055,141.308],shiroi:['白色恋人公园',43.089,141.271],nakajima:['中岛公园',43.044,141.355],susukino:['薄野',43.055,141.353]
 };
 const mapDays={19:['pudong'],20:['cts','sapporo','otaru'],21:['otaru','tengu','otaru','zenibako','minami','market','sakai','canal'],22:['otaru','sapporo','asahikawa','biei','shiraha','biei','asahikawa'],23:['asahikawa','zoo','asahikawa'],24:['asahikawa','sapporo','parco','odori','susukino'],25:['sapporo','univ','shrine','shiroi','susukino'],26:['susukino','nakajima','odori','susukino'],27:['sapporo','cts']};
 function mapDayContent(d) {
  const h=D.hotels[d.hotel];
  return `<div class="map-day-heading"><div><p class="day-label">12月${d.date}日 · Day ${d.day} · ${escape(d.city)}</p><h2>${escape(d.title)}</h2><p class="muted">${escape(d.notes)}</p></div><button class="button secondary" data-select-day="${d.date}">在行程页查看 ${icon('arrow')}</button></div><div class="map-day-columns"><section aria-label="当天具体安排">${timeline(d)}</section><aside class="map-day-aside"><div class="aside-block"><h3>${d.date===27?'返程前酒店':'当晚酒店'}</h3><p class="hotel-name">${escape(h.name)}</p><p>早餐：${escape(h.breakfast)}</p><p>${escape(h.checkout)}</p><div class="aside-buttons"><button class="text-button" data-hotel="${d.hotel}">酒店详情</button>${external(mapLink(h.jp+' '+h.address),'酒店导航')}</div></div><div class="aside-block"><h3>当天地点</h3><ol class="map-place-list">${[...new Set(mapDays[d.date])].map(key=>`<li><button class="text-button" data-map-place="${key}">${escape(mapPlaces[key][0])}${icon('pin')}</button></li>`).join('')}</ol>${docButton('section12','完整导航入口')}</div></aside></div>`;
 }
 function mapView() {
  const d=dayData();
  return `<div class="map-page"><div class="map-heading-wrap">${heading('地图','拖动日期，查看当天路线与安排。')}</div><section class="map-stage" aria-label="当天旅行地图"><div id="trip-map" role="region" aria-label="可缩放的旅行地图" tabindex="0"></div><div class="map-overlay-label glass"><span id="map-region-label">${escape(d.city)}</span><small>虚线连接行程地点 · 非实际乘车路线</small></div><p id="map-network-status" class="map-network-status" role="status" hidden>底图暂时无法加载；当天地点、路线示意与下方导航仍可使用。</p></section><div class="map-timeline-wrap"><section class="map-timeline glass" aria-label="九天旅行进度"><div class="map-timeline-head"><output id="map-day-label" for="map-date-slider" aria-live="polite">12.${d.date} · ${escape(d.title)}</output><span>拖动切换日期</span></div><div class="map-date-track" style="--map-progress:${(d.date-19)/8*100}%"><div class="map-track-line" aria-hidden="true"></div><label class="sr-only" for="map-date-slider">选择旅行日期</label><input id="map-date-slider" type="range" min="19" max="27" step="1" value="${d.date}" aria-valuetext="12月${d.date}日，${escape(d.title)}"><div class="map-date-nodes">${D.days.map(x=>`<button data-map-day="${x.date}" aria-pressed="${x.date===d.date}" aria-label="12月${x.date}日，${escape(x.city)}"><i aria-hidden="true"></i><strong>12.${x.date}</strong><small>${escape(x.city.split(' / ')[0])}</small></button>`).join('')}</div></div></section></div><section id="map-day-info" class="map-day-info">${mapDayContent(d)}</section><div class="map-bottom-note">${note('地点标记为位置参考；准确入口与公共交通请打开各项Google Maps导航。在线底图由OpenStreetMap提供。')}${sourceNote()}</div></div>`;
 }
 function drawMapDay({fit=true}={}) {
  if(!tripMap)return;
  const d=dayData(),keys=mapDays[d.date],points=keys.map(k=>mapPlaces[k].slice(1));
  mapRouteLayer.clearLayers();
  L.polyline(points,{color:'#28739b',weight:3,opacity:.85,dashArray:'7 9',lineCap:'round'}).addTo(mapRouteLayer);
  [...new Set(keys)].forEach((key,index)=>{
   const place=mapPlaces[key];
   const marker=L.marker(place.slice(1),{icon:L.divIcon({className:'trip-map-marker',html:`<span>${index+1}</span>`,iconSize:[32,32],iconAnchor:[16,16]}),title:place[0],alt:place[0],keyboard:true}).addTo(mapRouteLayer);
   marker.getElement()?.setAttribute('aria-label',place[0]);
   marker.bindTooltip(escape(place[0]),{direction:'top',offset:[0,-16],permanent:true,className:'trip-map-tooltip'});
   marker.bindPopup(`<strong>${escape(place[0])}</strong><p>12月${d.date}日 · 位置参考</p>${external(mapLink(place[0]+(d.date===19?' 上海':' 北海道')),'打开Google Maps')}`);
  });
  if(fit)tripMap.fitBounds(L.latLngBounds(points),{paddingTopLeft:[65,80],paddingBottomRight:[65,65],maxZoom:13,animate:false});
 }
 function createMapCanvas(el,message){
  if(!el)return null;if(!window.L){if(message)message.hidden=false;return null;}
  const map=L.map(el,{scrollWheelZoom:false,zoomControl:false,attributionControl:true,fadeAnimation:false,zoomAnimation:false});
  L.control.zoom({zoomInTitle:'放大地图',zoomOutTitle:'缩小地图'}).addTo(map);let ready=false;
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
  tiles.on('tileload',()=>{ready=true;if(message)message.hidden=true;});tiles.on('tileerror',()=>{if(message&&!ready)message.hidden=false;});tiles.addTo(map);return map;
 }
 function createBaseMap(){tripMap=createMapCanvas($('#trip-map'),$('#map-network-status'));return Boolean(tripMap);}
 function initTripMap(){if(!createBaseMap())return;mapRouteLayer=L.layerGroup().addTo(tripMap);drawMapDay();}
 function updateMapDate(date) {
  if(!D.days.some(d=>d.date===date))return;
  state.date=date;const d=dayData();
  $('#map-day-info').innerHTML=mapDayContent(d);
  $('#map-day-label').textContent=`12.${d.date} · ${d.title}`;
  $('#map-region-label').textContent=d.city;
  const slider=$('#map-date-slider');slider.value=String(date);slider.setAttribute('aria-valuetext',`12月${d.date}日，${d.title}`);
  $('.map-date-track').style.setProperty('--map-progress',`${(date-19)/8*100}%`);
  $$('[data-map-day]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mapDay)===date)));
  drawMapDay();
 }
 function shoppingView() {return `<div class="page">${heading('逛街清单','商场、店铺与营业参考。',docButton('section9','店铺顺序与完整资料','button secondary'))}<section class="shopping-list">${D.shopping.map(s=>`<article class="shopping-row"><span class="city-tag">${escape(s.city)}</span><div><h2>${escape(s.name)}</h2><p>${escape(s.summary)}</p><details class="inline-detail"><summary>展开店铺信息</summary><p>${escape(s.detail)}</p></details></div>${external(mapLink(s.place),'打开地图','button secondary')}</article>`).join('')}</section>${sourceNote()}</div>`;}
 function taskKey() {return 'hokkaido-tasks-'+state.person;}
 function prepareView() {
  const saved=getStored(taskKey(),{});const count=D.tasks.filter((_,i)=>saved[i]).length;
  return `<div class="page">${heading('行李准备',`${escape(state.person)}的准备清单，勾选仅保存在当前设备。`,docButton('section6','购买与预约时间表','button secondary'))}<div class="prep-topline"><div class="segments" aria-label="准备阶段">${['行前','上海','入境后','返程'].map(p=>`<button data-phase="${p}" aria-pressed="${state.phase===p}">${p}</button>`).join('')}</div><p class="prep-progress" id="prep-progress">已勾选 ${count} / ${D.tasks.length}</p></div><div class="prep-list">${D.tasks.map((t,i)=>({...t,i})).filter(t=>t.phase===state.phase).map(t=>`<article class="task-row ${saved[t.i]?'is-done':''}"><label><input type="checkbox" data-task="${t.i}" ${saved[t.i]?'checked':''}><span><strong>${escape(t.title)}</strong><p>${escape(t.text)}</p></span></label>${docButton(t.doc,'看步骤')}</article>`).join('')}</div><p class="prep-note">${storageAvailable?'保存在这台设备，hcj与ee分别记录；换设备不会自动同步。':'浏览器未允许保存，目前勾选只在本次浏览有效。'}</p><div class="source-note">${note('基础资料在首次成功载入后可离线查看；地图导航、官方预约、最新信息及音乐仍需网络。')}<p id="offline-status" style="margin-top:12px"></p></div></div>`;
 }
 function cleanupMotion() {if(state.mm){state.mm.revert();state.mm=null;}if(window.ScrollTrigger)ScrollTrigger.getAll().forEach(t=>t.kill());}
 function motion() {
  if(!window.gsap)return;
  state.mm=gsap.matchMedia();
  state.mm.add({desktop:'(min-width: 901px)',reduced:'(prefers-reduced-motion: reduce)'},ctx=>{
   if(ctx.conditions.reduced)return;
   if(state.route==='home'){
    gsap.timeline({defaults:{ease:'power2.out'}}).from('.hero-copy h1',{autoAlpha:0,y:15,duration:.8}).from('.hero-date',{autoAlpha:0,y:10,duration:.6},'-.45').from('.hero-action',{autoAlpha:0,y:8,duration:.5},'-.35');
    if(window.ScrollTrigger){
     gsap.registerPlugin(ScrollTrigger);
     if(ctx.conditions.desktop)gsap.timeline({scrollTrigger:{trigger:'.hero-shell',start:'top top',end:'+=30%',pin:'.hero',scrub:.7}}).to('.hero-image',{scale:1.035,ease:'none'},0).to('.hero-copy',{autoAlpha:.05,y:-28,ease:'none'},0);
     gsap.from('.journey-heading > *,.city-stop,.home-actions',{autoAlpha:0,y:18,stagger:.07,duration:.65,scrollTrigger:{trigger:'.home-journey',start:'top 86%',once:true}});
    }
   }
  });
 }
 function render({focus=false,preserve=false}={}) {
  cleanupMotion();if(tripMap){tripMap.remove();tripMap=null;mapRouteLayer=null;foodMarkers.clear();foodLeaderLayer=null;}const oldY=scrollY;
  const active=document.activeElement;
  const focusAttributes=['data-day','data-week','data-filter','data-city','data-phase','data-transport','data-map-day'];
  const focusKey=active ? focusAttributes.find(k=>active.hasAttribute(k)) : null;
  const focusValue=focusKey?active.getAttribute(focusKey):null;
  document.body.classList.toggle('on-home',state.route==='home');
  const view={home:homeView,our:ourHokkaidoView,itinerary:itineraryView,transport:transportView,food:foodView,hotels:hotelsView,map:mapView,shopping:shoppingView,prepare:prepareView}[state.route];
  $('#main').innerHTML=view?view():`<div class="page">${heading('这一页，暂时没有。','回到首页或从导航继续浏览。')}<a class="button" href="#/home">回到首页</a></div>`;
  document.title=(routes[state.route]||'页面未找到')+' · 北海道之旅';
  $$('[data-nav]').forEach(el=>{if(el.dataset.nav===state.route)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('#mobile-menu').hidden=true;$('#mobile-menu-toggle').setAttribute('aria-expanded','false');
  $$('.more-nav').forEach(el=>el.open=false);
  if(preserve)window.scrollTo(0,oldY);else window.scrollTo(0,0);
  if(focus)$('#main').focus({preventScroll:true});
  else if(focusKey){const target=document.querySelector(`[${focusKey}="${CSS.escape(focusValue)}"]`);(target?.disabled?document.querySelector('.calendar-day[aria-pressed="true"]'):target)?.focus({preventScroll:true});}
  if(state.route==='map')initTripMap();
  if(state.route==='food')initFoodMap();
  motion();
  const offline=$('#offline-status');if(offline)offline.textContent=state.offlineReady?'离线手册已准备 · 外部地图和音乐仍需联网':navigator.onLine?'当前在线，正在准备基础离线资料':'当前离线；显示已缓存的旅行资料';
 }
 function navigate(route) {if(location.hash==='#/'+route){state.route=route;render({focus:true});}else location.hash='/'+route;}
 function chooseDay(value, go=true) {state.date=Number(value);state.week=state.date<21?14:21;state.filter='all';if(go&&state.route!=='itinerary')navigate('itinerary');else render({preserve:true});}
 function openDetail(title, html, context='旅行资料') {
  disposeHotelMap();
  const dialog=$('#detail-dialog');dialog.classList.remove('image-dialog','hotel-map-dialog');$('#detail-context').textContent=context;
  $('#detail-body').innerHTML=`<h2 id="detail-title">${escape(title)}</h2>${html}`;
  $$('#detail-body a').forEach(a=>{if(a.href.startsWith('http')){a.target='_blank';a.rel='noopener noreferrer';}});
  $$('#detail-body table').forEach(t=>{const wrapper=document.createElement('div');wrapper.className='table-scroll';wrapper.tabIndex=0;wrapper.setAttribute('aria-label','可横向滚动的资料表');t.replaceWith(wrapper);wrapper.append(t);});
  if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;
 }
 function openDoc(id) {const doc=D.docs[id];if(!doc)return;const html=marked.parse(doc.markdown,{breaks:false}).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');openDetail(doc.title,`<div class="document-body">${html}</div><p class="source-note">来源：最终旅行计划书v3 · ${D.updated}</p>`,'完整旅行手册');}
 function openHotelImage(index){const h=D.hotels[index];if(!h||index===0)return;openDetail(h.name,`<img class="food-image-full" src="assets/hotel-${index}-full.webp" alt="${escape(h.name)}酒店图标" width="1024" height="1024">`,'酒店图标');$('#detail-dialog').classList.add('image-dialog');}
 function openDayImage(date){const d=D.days.find(x=>x.date===date);if(!d)return;openDetail(`12月${date}日 · ${d.title}`,`<img class="food-image-full" src="assets/day-${date}-full.webp" alt="${escape(d.title)}行程图标" width="1024" height="1024">`,'行程图标');$('#detail-dialog').classList.add('image-dialog');}
 function openFoodImage(index) {
  const f=D.foods[index];if(!f)return;
  openDetail(f.type,`<img class="food-image-full" src="assets/food-${f.art}-full.webp" alt="${escape(f.type)}菜系图标" width="1024" height="1024"><p class="source-note">菜系示意图，非店铺实拍。</p>`,'图片预览');
  $('#detail-dialog').classList.add('image-dialog');
 }
 function openFood(index) {const f=D.foods[index];openDetail(f.name,`<p class="detail-lead">${escape(f.city)} · ${escape(f.type)} · ${escape(f.when)}</p><dl class="detail-facts"><div><dt>营业参考</dt><dd>${escape(f.hours)}</dd></div><div><dt>地址</dt><dd>${escape(f.address)}</dd></div><div><dt>怎么点</dt><dd>${escape(f.order)}</dd></div></dl><details class="inline-detail"><summary>查看备选餐厅</summary><p>${escape(f.alt)}</p></details><div class="detail-actions">${external(mapLink(f.address+' '+f.name),'地图导航','button')}${external(f.link,'官方信息 / 预约','button secondary')}</div>${note('餐厅尚未代预约；节日营业、海胆供应与取消规则以下单页面和店方为准。')}${docButton('section8','完整餐饮与预约步骤')}`,'吃喝清单');}
 let hotelDialogMap=null;
 function disposeHotelMap(){if(hotelDialogMap){hotelDialogMap.remove();hotelDialogMap=null;}}
 function openHotelMap(index){
  const h=D.hotels[index];if(!h?.mapPoint)return;
  openDetail(h.name,`<div class="hotel-map-meta"><img src="assets/hotel-${index}.webp" alt="" width="76" height="76"><div><p>${escape(h.city)} · ${escape(h.dates)}</p><p>${escape(h.address)}</p></div></div><div class="hotel-location-wrap"><div id="hotel-location-map" class="hotel-location-map" role="region" aria-label="${escape(h.name)}位置地图" tabindex="0"></div><p id="hotel-map-status" class="hotel-map-error" role="status" hidden>底图暂时无法加载，可使用下方Google Maps导航。</p></div><div class="hotel-map-actions">${external(mapLink(h.jp+' '+h.address),'导航到酒店','button')}<button class="button secondary" data-hotel="${index}">住宿详情 ${icon('arrow')}</button></div><p class="source-note">按酒店地址定位，准确入口请查看Google Maps导航。</p>`,'酒店地图');
  $('#detail-dialog').classList.add('hotel-map-dialog');
  hotelDialogMap=createMapCanvas($('#hotel-location-map'),$('#hotel-map-status'));if(!hotelDialogMap)return;
  hotelDialogMap.setView([h.mapPoint.lat,h.mapPoint.lng],16,{animate:false});
  const marker=L.marker([h.mapPoint.lat,h.mapPoint.lng],{icon:L.divIcon({className:'hotel-map-pin',html:`<img src="assets/hotel-${index}.webp" alt="" width="100" height="100">`,iconSize:[100,100],iconAnchor:[50,75]}),title:h.name,keyboard:true,autoPanOnFocus:false}).addTo(hotelDialogMap);
  marker.getElement()?.setAttribute('aria-label',h.name);marker.bindTooltip(escape(h.name),{permanent:true,direction:'top',offset:[0,-70],className:'trip-map-tooltip'});
 }
 function openHotel(index) {const h=D.hotels[index];openDetail(h.name,`<p class="detail-lead">${escape(h.dates)}</p><dl class="detail-facts">${[['日文名称',h.jp],['地址',h.address],['到店 / 寄存',h.access],['早餐',h.breakfast],['退房 / 出发',h.checkout],['浴场',h.bath],['补充',h.detail],['电话',h.phone]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl><div class="detail-actions">${external(mapLink(h.jp+' '+h.address),'导航到酒店','button')}<button class="button secondary" data-copy="${escape(h.address)}">复制地址 ${icon('copy')}</button>${h.link?external(h.link,'酒店官网','button outline'):''}</div>${docButton('section7','完整住宿资料与来源')}`,'住宿');}
 function formatTime(value) {if(!Number.isFinite(value))return'0:00';return Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0');}
 function updateAudio() {
  const playing=!audio.paused;document.body.classList.toggle('paused',!playing);
  $$('[data-audio-toggle]').forEach(b=>{b.setAttribute('aria-label',playing?'暂停音乐':'播放音乐');if(b.classList.contains('mini-play'))b.innerHTML=icon(playing?'pause':'play');});
  $('#welcome-play').innerHTML=icon(playing?'pause':'play')+(playing?'暂停音乐':'播放音乐');
  $('.now-playing').textContent=playing?'正在播放':'等待播放';
  $$('[data-elapsed]').forEach(x=>x.textContent=formatTime(audio.currentTime));
  $$('[data-duration]').forEach(x=>x.textContent=formatTime(audio.duration||263.42));
  $$('.audio-seek').forEach(x=>{x.max=audio.duration||263.42;if(document.activeElement!==x)x.value=audio.currentTime;});
 }
 function audioMessage(message){$('#audio-status').textContent=message;$('#welcome-audio-status').textContent=message;}
 function playAudio({automatic=false}={}) {
  if(!audio.paused){autoplayPending=false;audioMessage('');return Promise.resolve();}
  if(playRequest)return playRequest;
  // Keep play() synchronous with the trusted gesture; never wait for loading first.
  if(audio.error)audio.load();
  const request=audio.play();
  playRequest=Promise.resolve(request).then(()=>{autoplayPending=false;audioMessage('');updateAudio();}).catch(error=>{
   if(error.name==='NotAllowedError'){
    autoplayPending=true;
    audioMessage('点击播放按钮或页面任意位置开始音乐。');
   }else if(error.name!=='AbortError'){
    autoplayPending=true;
    audioMessage('音乐未载入，联网后点击播放重试。');
    if(!automatic)toast('音乐未载入，请联网后重试。');
   }
   updateAudio();
  }).finally(()=>{playRequest=null;});
  return playRequest;
 }
 function toggleAudio(){if(audio.paused){userPaused=false;playAudio();}else{userPaused=true;autoplayPending=false;audio.pause();audioMessage('');}}
 function enter(person) {
  state.person=person;$('#profile-img').src=`assets/${person}-avatar.webp`;$('#profile-name').textContent=person;
  // Invoke playback in the avatar click gesture, before animation or route rendering.
  if(audio.paused&&!userPaused)playAudio();
  $('#site').hidden=false;$('#welcome').hidden=true;document.body.classList.remove('is-welcome');
  state.route='home';history.replaceState(null,'','#/home');render({focus:true});
 }
 function profileDialog(){openDetail('选择身份',`<p class="detail-lead">切换身份可分别记录准备清单，行程内容相同。</p><div class="profile-card-list">${['hcj','ee'].map(p=>`<button class="profile-card liquid-panel" data-switch-person="${p}" aria-pressed="${state.person===p}"><img src="assets/${p}-avatar.webp" alt="" width="88" height="88"><strong>${p}</strong></button>`).join('')}</div>`,'身份选择');}
 const searchIndex=[...D.foods.map((f,i)=>({title:f.name,context:f.city+' · '+f.when,text:Object.values(f).join(' '),kind:'food',id:i})),...D.hotels.map((h,i)=>({title:h.name,context:'住宿 · '+h.dates,text:Object.values(h).join(' '),kind:'hotel',id:i})),...D.days.flatMap(d=>d.events.map(e=>({title:e.title,context:`12.${d.date} · ${d.city}`,text:Object.values(e).join(' '),kind:'day',id:d.date}))),...Object.entries(D.docs).filter(([id])=>id.startsWith('section')).map(([id,d])=>({title:d.title,context:'完整旅行手册',text:d.markdown,kind:'doc',id}))];
 function search(){const raw=$('#search-input').value;const q=raw.normalize('NFKC').trim().toLocaleLowerCase();if(!q){$('#search-results').innerHTML='';$('#search-count').textContent='试试「海胆」「机场」「Pass」';return;}const results=searchIndex.filter(x=>(x.title+' '+x.context+' '+x.text).normalize('NFKC').toLocaleLowerCase().includes(q));$('#search-count').textContent=`找到 ${results.length} 项${results.length>24?'，优先展示前24项':''}`;$('#search-results').innerHTML=results.length?results.slice(0,24).map(r=>`<button class="search-result" data-search-kind="${r.kind}" data-search-id="${r.id}"><strong>${escape(r.title)}</strong><span>${escape(r.context)}</span></button>`).join(''):'<p class="search-empty">没有找到相关资料。试试地名、店名，或「JR」「早餐」。</p>';}
 document.addEventListener('click',async ev=>{
  const b=ev.target.closest('button,a');if(!b)return;
  if(b.dataset.enter)enter(b.dataset.enter);
  if(b.hasAttribute('data-audio-toggle'))toggleAudio();
  if(b.dataset.seek){audio.currentTime=Math.max(0,Math.min(audio.duration||263.42,audio.currentTime+Number(b.dataset.seek)));updateAudio();}
  if(b.dataset.closeDialog)$('#'+b.dataset.closeDialog).close();
  if(b.dataset.go)navigate(b.dataset.go);
  if(b.dataset.selectDay)chooseDay(b.dataset.selectDay);
  if(b.dataset.day)chooseDay(b.dataset.day,false);
  if(b.dataset.week){state.week=Number(b.dataset.week);state.date=state.week===14?20:21;state.filter='all';render({preserve:true});}
  if(b.dataset.filter){state.filter=b.dataset.filter;render({preserve:true});}
  if(b.dataset.city){state.city=b.dataset.city;state.foodSelected=cityFoods()[0].i;render({preserve:true});}
  if(b.dataset.phase){state.phase=b.dataset.phase;render({preserve:true});}
  if(b.dataset.transport){state.transport=b.dataset.transport;render({preserve:true});}
  if(b.dataset.mapDay)updateMapDate(Number(b.dataset.mapDay));
  if(b.dataset.mapPlace&&tripMap){const p=mapPlaces[b.dataset.mapPlace];tripMap.setView(p.slice(1),14,{animate:false});$('#trip-map').focus({preventScroll:true});}
  if(b.dataset.doc)openDoc(b.dataset.doc);
  if(b.hasAttribute('data-food'))openFood(Number(b.dataset.food));
  if(b.hasAttribute('data-food-select')){selectFood(Number(b.dataset.foodSelect));$('#food-selection').scrollIntoView({block:'center',behavior:'instant'});}
  if(b.hasAttribute('data-food-map-reset'))fitFoodMap();
  if(b.hasAttribute('data-food-image'))openFoodImage(Number(b.dataset.foodImage));
  if(b.hasAttribute('data-day-image'))openDayImage(Number(b.dataset.dayImage));
  if(b.hasAttribute('data-hotel-map'))openHotelMap(Number(b.dataset.hotelMap));
  if(b.hasAttribute('data-hotel-image'))openHotelImage(Number(b.dataset.hotelImage));
  if(b.hasAttribute('data-hotel'))openHotel(Number(b.dataset.hotel));
  if(b.dataset.copy){try{await navigator.clipboard.writeText(b.dataset.copy);toast('地址已复制');}catch{toast('未能复制，请在详情中选中地址手动复制。');}}
  if(b.dataset.switchPerson){state.person=b.dataset.switchPerson;$('#profile-img').src=`assets/${state.person}-avatar.webp`;$('#profile-name').textContent=state.person;$('#detail-dialog').close();render({preserve:true});toast(`已切换为${state.person}`);}
  if(b.hasAttribute('data-scroll-journey')){ev.preventDefault();$('#journey').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  if(b.dataset.searchKind){$('#search-dialog').close();const kind=b.dataset.searchKind,id=b.dataset.searchId;if(kind==='day')chooseDay(id);if(kind==='food')openFood(Number(id));if(kind==='hotel')openHotel(Number(id));if(kind==='doc')openDoc(id);}
 });
 document.addEventListener('input',ev=>{
  if(ev.target.id==='map-date-slider')updateMapDate(Number(ev.target.value));
  const el=ev.target;if(el.matches('.audio-seek')){if(Number.isFinite(audio.duration))audio.currentTime=Number(el.value);updateAudio();}
  if(el.matches('.audio-volume')){audio.volume=Number(el.value);audio.muted=false;$$('.audio-volume').forEach(x=>{if(x!==el)x.value=el.value;});$('#mute-toggle').textContent='静音';}
 });
 document.addEventListener('change',ev=>{const el=ev.target;if(el.hasAttribute('data-task')){const tasks=getStored(taskKey(),{});tasks[el.dataset.task]=el.checked;if(!setStored(taskKey(),tasks))toast('浏览器未允许保存，当前勾选可能在刷新后丢失。');el.closest('.task-row').classList.toggle('is-done',el.checked);$('#prep-progress').textContent=`已勾选 ${D.tasks.filter((_,i)=>tasks[i]).length} / ${D.tasks.length}`;}});
 $('#search-open').innerHTML=icon('search');$('#theme-toggle').innerHTML=icon(document.documentElement.dataset.theme==='dark'?'sun':'moon');$('#mobile-menu-toggle').innerHTML=icon('menu');$$('[data-close-dialog]').forEach(b=>b.innerHTML=icon('close'));
 $('#mobile-menu').innerHTML=Object.entries(routes).map(([k,v])=>`<a href="#/${k}" data-nav="${k}">${v}</a>`).join('');
 $('#mobile-menu-toggle').addEventListener('click',()=>{const open=$('#mobile-menu').hidden;$('#mobile-menu').hidden=!open;$('#mobile-menu-toggle').setAttribute('aria-expanded',String(open));});
 $('#theme-toggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('hokkaido-theme',theme);}catch{}$('#theme-toggle').innerHTML=icon(theme==='dark'?'sun':'moon');$('#theme-toggle').setAttribute('aria-label',theme==='dark'?'切换浅色模式':'切换深色模式');});
 $('#profile-open').addEventListener('click',profileDialog);
 $('#source-open').addEventListener('click',()=>openDetail('资料与来源',`<p class="detail-lead">本网站来自已确认的旅行计划，资料整理于${D.updated}。页面时间为目标安排，未代购车票或预订餐厅。</p><p>首页、两张头像与First Love音源由用户提供。菜系图标由用户提供，不是店铺实拍。中文手写字体Long Cang采用SIL Open Font License。</p><div class="manual-list">${Object.entries(D.docs).filter(([id])=>id.startsWith('section')).map(([id,d])=>docButton(id,d.title)).join('<br>')}</div><p class="source-note">外部资料链接保留在各章节中。基础离线不包含音乐、外部地图或官方实时页面。</p>`,'旅行手册'));
 $('#search-open').addEventListener('click',()=>{$('#search-dialog').showModal();document.body.style.overflow='hidden';$('#search-input').focus();});
 $('#search-input').addEventListener('input',ev=>{if(!ev.isComposing)search();});$('#search-input').addEventListener('compositionend',search);
 $('#search-clear').addEventListener('click',()=>{$('#search-input').value='';search();$('#search-input').focus();});
 $('#wheel-menu').addEventListener('click',()=>{$('#wheel-volume').hidden=!$('#wheel-volume').hidden;});
 $('#player-expand').addEventListener('click',()=>{const open=$('#mini-expanded').hidden;$('#mini-expanded').hidden=!open;$('#player-expand').setAttribute('aria-expanded',String(open));});
 $('#mute-toggle').addEventListener('click',()=>{audio.muted=!audio.muted;$('#mute-toggle').textContent=audio.muted?'取消静音':'静音';});
 ['play','pause','timeupdate','loadedmetadata','ended'].forEach(name=>audio.addEventListener(name,updateAudio));
 audio.addEventListener('error',()=>{$('#audio-status').textContent='音频未载入。联网后点击播放重试。';updateAudio();});
 audio.addEventListener('volumechange',()=>{$$('.audio-volume').forEach(el=>el.value=audio.muted?0:audio.volume);});
 // Circular pointer gesture. Buttons and native ranges offer a non-drag alternative.
 const wheel=$('#click-wheel');let lastAngle=null;
 wheel.addEventListener('pointerdown',ev=>{if(ev.target.closest('button'))return;const r=wheel.getBoundingClientRect();lastAngle=Math.atan2(ev.clientY-r.top-r.height/2,ev.clientX-r.left-r.width/2);wheel.setPointerCapture(ev.pointerId);$('#wheel-volume').hidden=false;});
 wheel.addEventListener('pointermove',ev=>{if(lastAngle===null)return;const r=wheel.getBoundingClientRect(),angle=Math.atan2(ev.clientY-r.top-r.height/2,ev.clientX-r.left-r.width/2);let delta=angle-lastAngle;if(delta>Math.PI)delta-=Math.PI*2;if(delta<-Math.PI)delta+=Math.PI*2;audio.volume=Math.max(0,Math.min(1,audio.volume+delta/Math.PI));audio.muted=false;lastAngle=angle;});
 ['pointerup','pointercancel','lostpointercapture'].forEach(name=>wheel.addEventListener(name,()=>{lastAngle=null;}));
 $$('dialog').forEach(dialog=>{dialog.addEventListener('click',ev=>{if(ev.target===dialog){const r=dialog.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{if(dialog.id==='detail-dialog')disposeHotelMap();if(!$$('dialog[open]').length)document.body.style.overflow='';});});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){$('#mobile-menu').hidden=true;$('#mobile-menu-toggle').setAttribute('aria-expanded','false');$('#mini-expanded').hidden=true;$('#player-expand').setAttribute('aria-expanded','false');}});
 window.addEventListener('hashchange',()=>{if(!state.person||!location.hash.startsWith('#/'))return;const next=location.hash.replace(/^#\//,'').split('?')[0]||'home';if(state.route!==next){if(next==='transport')state.transport='manual';state.route=next;render({focus:true});}});
 window.addEventListener('offline',()=>{toast('已离线，仍可查已缓存的旅行资料。');});
 window.addEventListener('online',()=>{toast('已恢复联网。');});
 updateAudio();
 // Try as soon as the welcome screen loads. If the browser blocks sound,
 // use the first trusted interaction without racing the explicit play button.
 function activatePendingAudio(event){
  if(!event.isTrusted||!autoplayPending||userPaused)return;
  if(event.type==='keydown'&&(event.repeat||event.metaKey||event.ctrlKey||event.altKey||!['Enter',' '].includes(event.key)))return;
  if(event.target.closest('[data-audio-toggle],.audio-seek,.audio-volume'))return;
  playAudio({automatic:true});
 }
 document.addEventListener('pointerdown',activatePendingAudio,{capture:true});
 document.addEventListener('keydown',activatePendingAudio,{capture:true});
 if(document.visibilityState==='visible')playAudio({automatic:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&autoplayPending&&!userPaused)playAudio({automatic:true});});
 if(window.gsap&&!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.timeline({defaults:{ease:'power2.out'}}).from('.ipod',{autoAlpha:0,y:28,rotation:-10,duration:1}).from('.identity-stage > *',{autoAlpha:0,y:13,stagger:.07,duration:.65},'-.65');
 if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{state.offlineReady=true;const el=$('#offline-status');if(el)el.textContent='离线手册已准备 · 外部地图和音乐仍需联网';}).catch(()=>{const el=$('#offline-status');if(el)el.textContent='离线资料未能缓存，联网后重新打开网站即可重试。';});
})();
