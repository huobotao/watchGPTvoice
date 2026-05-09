// Athro · SYD → NZ 机票 + 酒店特价监视器(高保真原型 / mock)
// 今日基准:2026-05-09(周六)。展示从今日起 7 天每日往返最低价 + 酒店均价。
// 预留 flightProvider 接口位:将来接 Skyscanner / Kiwi / Amadeus 时只替换 fetchCity()。

const TODAY_INDEX = 0; // mock 数据第 0 项即「今日」

const MOCK = {
  AKL: {
    name: '奥克兰',
    iata: 'AKL',
    bestIdx: 3,
    avgDeltaPct: -28,        // 较 30 日均价
    weekAvgDeltaPct: -9,
    days: [
      { md:'5/9',  dow:'六', price:612, hotel:165, rating:8.4, band:'high' },
      { md:'5/10', dow:'日', price:549, hotel:158, rating:8.5, band:'mid'  },
      { md:'5/11', dow:'一', price:478, hotel:142, rating:8.5, band:'mid'  },
      { md:'5/12', dow:'二', price:399, hotel:148, rating:8.6, band:'deal' },
      { md:'5/13', dow:'三', price:432, hotel:152, rating:8.5, band:'mid'  },
      { md:'5/14', dow:'四', price:511, hotel:161, rating:8.4, band:'mid'  },
      { md:'5/15', dow:'五', price:589, hotel:178, rating:8.3, band:'high' },
    ],
    notif: {
      title: '悉尼 → 奥克兰 命中特价!',
      text:  '5 月 12 日往返 A$399 · 同期 4★ 酒店 A$148/晚 · 比近 30 日均价低 28%',
    },
  },
  CHC: {
    name: '基督城',
    iata: 'CHC',
    bestIdx: 4,
    avgDeltaPct: -22,
    weekAvgDeltaPct: -6,
    days: [
      { md:'5/9',  dow:'六', price:725, hotel:138, rating:8.7, band:'high' },
      { md:'5/10', dow:'日', price:688, hotel:142, rating:8.6, band:'high' },
      { md:'5/11', dow:'一', price:602, hotel:129, rating:8.7, band:'mid'  },
      { md:'5/12', dow:'二', price:549, hotel:132, rating:8.7, band:'mid'  },
      { md:'5/13', dow:'三', price:498, hotel:135, rating:8.8, band:'deal' },
      { md:'5/14', dow:'四', price:556, hotel:144, rating:8.6, band:'mid'  },
      { md:'5/15', dow:'五', price:639, hotel:151, rating:8.5, band:'high' },
    ],
    notif: {
      title: '悉尼 → 基督城 命中特价!',
      text:  '5 月 13 日往返 A$498 · 同期 4★ 酒店 A$135/晚 · 比近 30 日均价低 22%',
    },
  },
};

// 占位:将来对接真实 API
async function fetchCity(iata) {
  return MOCK[iata];
}

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const grid       = $('#dayGrid');
const bestPrice  = $('#bestPrice');
const bestMeta   = $('#bestMeta');
const dealPill   = $('#dealPill');
const trendArrow = $('#trendArrow');
const trendText  = $('#trendText');
const hotelPrice = $('#hotelPrice');
const hotelRating= $('#hotelRating');
const updatedAt  = $('#updatedAt');
const notifTitle = $('#notifTitle');
const notifText  = $('#notifText');

function trendBetween(curr, prev) {
  if (prev == null) return { sym: '·', cls: 'flat' };
  const d = curr - prev;
  if (d <= -10) return { sym: '↘', cls: 'down' };
  if (d >=  10) return { sym: '↗', cls: 'up'   };
  return { sym: '→', cls: 'flat' };
}

function render(city) {
  // 7 day grid
  grid.innerHTML = '';
  city.days.forEach((d, i) => {
    const prev = city.days[i - 1]?.price;
    const t = trendBetween(d.price, prev);
    const isBest  = i === city.bestIdx;
    const isToday = i === TODAY_INDEX;

    const cell = document.createElement('button');
    cell.className = [
      'day',
      `is-${d.band === 'deal' ? 'low' : d.band}`,
      isBest  ? 'is-deal'  : '',
      isToday ? 'is-today' : '',
    ].filter(Boolean).join(' ');
    cell.setAttribute('aria-label',
      `${d.md} 周${d.dow},往返 A$${d.price},酒店 A$${d.hotel}/晚`);

    cell.innerHTML = `
      <span class="dow">周${d.dow}</span>
      <span class="dom">${d.md.split('/')[1]}</span>
      <span class="pri"><i>A$</i>${d.price}</span>
      <span class="trd ${t.cls}">${t.sym}</span>
    `;
    grid.appendChild(cell);
  });

  // summary
  const best = city.days[city.bestIdx];
  bestPrice.textContent = best.price;
  bestMeta.textContent  = `周${best.dow} ${best.md} · 往返 · 直飞`;
  hotelPrice.textContent = `A$${best.hotel}`;
  hotelRating.textContent = best.rating.toFixed(1);

  // trend
  const arrow = city.weekAvgDeltaPct < 0 ? '↘' : (city.weekAvgDeltaPct > 0 ? '↗' : '→');
  trendArrow.textContent = arrow;
  trendArrow.className = 'trend-arrow ' + (city.weekAvgDeltaPct < 0 ? 'down' : city.weekAvgDeltaPct > 0 ? 'up' : 'flat');
  const sign = city.avgDeltaPct < 0 ? '−' : '+';
  trendText.textContent = `较 30 日均价 ${sign}${Math.abs(city.avgDeltaPct)}%`;

  // deal pill 仅在命中时显示
  dealPill.style.display = city.avgDeltaPct <= -15 ? '' : 'none';

  // notification
  notifTitle.textContent = city.notif.title;
  notifText.textContent  = city.notif.text;

  updatedAt.textContent = `${Math.floor(Math.random() * 4) + 1} 分钟前`;
}

async function switchCity(iata) {
  const city = await fetchCity(iata);
  render(city);
}

$$('.city-tab').forEach(btn => {
  if (btn.classList.contains('city-tab-add')) {
    btn.addEventListener('click', () => {
      // 预留:打开主 App 的「添加目的地」面板
      btn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'ease-out' }
      );
    });
    return;
  }
  btn.addEventListener('click', () => {
    $$('.city-tab').forEach(x => x.classList.remove('is-active'));
    btn.classList.add('is-active');
    switchCity(btn.dataset.city);
  });
});

// Day cell click → 简单脉冲反馈,真实版应跳转到详情/预订
grid.addEventListener('click', (e) => {
  const cell = e.target.closest('.day');
  if (!cell) return;
  cell.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }],
    { duration: 200, easing: 'ease-out' }
  );
});

switchCity('AKL');
