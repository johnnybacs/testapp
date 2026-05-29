const REPUBBLICA_HOME = "https://www.repubblica.it/";
const OPEN_ONLINE_HOME = "https://www.open.online/";
const CORRIERE_HOME = "https://www.corriere.it/";
const MESSAGGERO_HOME = "https://www.ilmessaggero.it/";
const UBITENNIS_HOME = "https://www.ubitennis.com/";
const GAZZETTA_HOME = "https://www.gazzetta.it/";
const CORRIEREDELLOSPORT_HOME = "https://www.corrieredellosport.it/";
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const STOOQ_QUOTE_BASE = "https://stooq.com/q/l/";

const ROTATE_SECONDS = 10;
const RANDOM_COUNT = 3;

const FIXED_CITIES = [
  { name: "Milano", lat: 45.4642, lon: 9.19 },
  { name: "Salice", lat: 40.3867, lon: 18.0028 },
  { name: "Santa Croce di Magliano", lat: 41.6997, lon: 14.6994 },
];

const ITALIAN_CITIES = [
  { name: "Roma", lat: 41.9028, lon: 12.4964 },
  { name: "Napoli", lat: 40.8518, lon: 14.2681 },
  { name: "Palermo", lat: 38.1157, lon: 13.3615 },
  { name: "Torino", lat: 45.0703, lon: 7.6869 },
  { name: "Bologna", lat: 44.4949, lon: 11.3426 },
  { name: "Firenze", lat: 43.7696, lon: 11.2558 },
  { name: "Venezia", lat: 45.4408, lon: 12.3155 },
  { name: "Genova", lat: 44.4056, lon: 8.9463 },
  { name: "Bari", lat: 41.1171, lon: 16.8719 },
  { name: "Catania", lat: 37.5079, lon: 15.083 },
  { name: "Verona", lat: 45.4384, lon: 10.9916 },
  { name: "Trieste", lat: 45.6495, lon: 13.7768 },
  { name: "Perugia", lat: 43.1107, lon: 12.3908 },
  { name: "Cagliari", lat: 39.2238, lon: 9.1217 },
  { name: "Ancona", lat: 43.6158, lon: 13.5189 },
  { name: "L'Aquila", lat: 42.3498, lon: 13.3995 },
  { name: "Campobasso", lat: 41.5595, lon: 14.6674 },
  { name: "Potenza", lat: 40.6404, lon: 15.8056 },
  { name: "Catanzaro", lat: 38.9098, lon: 16.5877 },
  { name: "Reggio Calabria", lat: 38.1112, lon: 15.6473 },
  { name: "Messina", lat: 38.1938, lon: 15.554 },
  { name: "Parma", lat: 44.8015, lon: 10.3279 },
  { name: "Modena", lat: 44.6471, lon: 10.9252 },
  { name: "Pisa", lat: 43.7228, lon: 10.4017 },
  { name: "Siena", lat: 43.3188, lon: 11.3308 },
  { name: "Bolzano", lat: 46.4983, lon: 11.3548 },
  { name: "Trento", lat: 46.0748, lon: 11.1217 },
];

const RANDOM_POOL = ITALIAN_CITIES.filter(
  (city) => !FIXED_CITIES.some((fixed) => fixed.name === city.name)
);

const citiesEl = document.getElementById("cities");
const mapMarkersEl = document.getElementById("map-markers");
const timerValueEl = document.getElementById("timer-value");
const timerRingEl = document.getElementById("timer-ring");

const tempCache = new Map();
let secondsLeft = ROTATE_SECONDS;
let displayedCities = [];

function initItalyMapShape() {
  const svg = document.getElementById("italy-map");
  svg.setAttribute("viewBox", ITALY_MAP_VIEW);
  document.getElementById("italy-map-land").setAttribute("d", ITALY_MAP_D);
}

function cityToMapPoint(city) {
  return { x: city.lon, y: city.lat };
}

function isFixedCity(city) {
  return FIXED_CITIES.some((fixed) => fixed.name === city.name);
}

function updateItalyMap(cities) {
  mapMarkersEl.innerHTML = cities
    .map((city) => {
      const { x, y } = cityToMapPoint(city);
      if (city.name === "Santa Croce di Magliano") {
        return `
          <g class="map-marker map-marker--heart">
            <circle class="map-marker__halo map-marker__halo--heart" cx="${x}" cy="${y}" r="0.45" />
            <g transform="translate(${x}, ${y}) scale(1, -1)">
              <path class="map-marker__heart" d="M 0,-0.35 C -0.35,-0.1 -0.35,0.25 0,0.15 C 0.35,0.25 0.35,-0.1 0,-0.35 Z" />
            </g>
          </g>
        `;
      }
      const kind = isFixedCity(city) ? "fixed" : "random";
      return `
        <g class="map-marker map-marker--${kind}">
          <circle class="map-marker__halo" cx="${x}" cy="${y}" r="0.35" />
          <circle class="map-marker__dot" cx="${x}" cy="${y}" r="0.16" />
        </g>
      `;
    })
    .join("");
}

function decodeHtml(text) {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value.replace(/\s+/g, " ").trim();
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeImage(url) {
  if (!url) return false;
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

function looksLikeVideo(url) {
  if (!url) return false;
  return /\.(mp4|webm|m3u8)(\?|$)/i.test(url);
}

function toAbsoluteUrl(home, path) {
  if (!path) return home;
  if (path.startsWith("http")) return path;
  return new URL(path, home).href;
}

async function fetchHomepage(url) {
  const proxies = [
    (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
    (target) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  ];

  let lastError;
  for (const buildUrl of proxies) {
    try {
      const res = await fetch(buildUrl(url));
      if (!res.ok) throw new Error("Risposta non valida");
      const html = await res.text();
      if (html.length > 200 && !html.includes("error code:")) return html;
      throw new Error("Contenuto non valido");
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function fetchTextWithFallback(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > 20) return text;
    throw new Error("Risposta vuota");
  } catch (directErr) {
    try {
      return await fetchHomepage(url);
    } catch (proxyErr) {
      const msg = directErr?.message || proxyErr?.message || "Errore rete";
      throw new Error(msg);
    }
  }
}

function pickRssImage(item) {
  const thumb =
    item.querySelector("media\\:thumbnail")?.getAttribute("url") || "";
  if (looksLikeImage(thumb)) return thumb;

  const media = item.querySelector("media\\:content");
  if (media) {
    const type = media.getAttribute("type") || "";
    const url = media.getAttribute("url") || "";
    if (/^image\//i.test(type) || looksLikeImage(url)) return url;
    if (!looksLikeVideo(url) && url) return url;
  }

  const enc = item.querySelector("enclosure");
  if (enc) {
    const type = enc.getAttribute("type") || "";
    const url = enc.getAttribute("url") || "";
    if (/^image\//i.test(type) || looksLikeImage(url)) return url;
  }

  const html =
    item.querySelector("content\\:encoded")?.textContent ||
    item.querySelector("description")?.textContent ||
    "";
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : "";
}

function tryParseRss(text) {
  if (!text) return null;
  if (!/<rss[\s>]|<feed[\s>]/i.test(text)) return null;

  const xml = new DOMParser().parseFromString(text, "text/xml");
  if (xml.querySelector("parsererror")) return null;

  const items = [...xml.querySelectorAll("item, entry")];
  for (const item of items.slice(0, 12)) {
    const title = (item.querySelector("title")?.textContent || "").trim();

    const link =
      item.querySelector("link")?.textContent?.trim() ||
      item.querySelector("link")?.getAttribute?.("href") ||
      "";

    if (!title || !link) continue;

    const image = pickRssImage(item);
    const cleanTitle = decodeHtml(stripTags(title));
    const isVideo = /\/video\//i.test(link) || /\bvideo\b/i.test(cleanTitle);

    if (isVideo && !looksLikeImage(image)) continue;

    return { title: cleanTitle, link, image };
  }

  return null;
}

async function loadSportColumn(columnId, homepage, fallbackParser) {
  const rssCandidates = [
    `${homepage.replace(/\/$/, "")}/feed/`,
    `${homepage.replace(/\/$/, "")}/rss`,
    `${homepage.replace(/\/$/, "")}/rss.xml`,
    `${homepage.replace(/\/$/, "")}/feed.xml`,
    `${homepage.replace(/\/$/, "")}/rss/home.xml`,
    `${homepage.replace(/\/$/, "")}/rss/homepage.xml`,
    `${homepage.replace(/\/$/, "")}/rss.xml?output=rss`,
  ];

  for (const rss of rssCandidates) {
    try {
      const text = await fetchHomepage(rss);
      const story = tryParseRss(text);
      if (story) {
        await loadColumnFromStory(columnId, story, homepage);
        return;
      }
    } catch {}
  }

  await loadColumn(columnId, homepage, fallbackParser);
}

async function loadColumnFromStory(columnId, story, homepage) {
  const column = document.getElementById(columnId);
  const linkEl = column.querySelector(".story");
  const imgEl = column.querySelector(".story__img");
  const titleEl = column.querySelector(".story__title");

  imgEl.classList.add("loading");

  linkEl.href = story.link || homepage;
  titleEl.textContent = story.title || "Notizia non disponibile";
  titleEl.classList.remove("error");
  imgEl.alt = story.title || "";

  let imageUrl = story.image || "";
  if (imageUrl && (looksLikeVideo(imageUrl) || !looksLikeImage(imageUrl))) {
    imageUrl = "";
  }

  if (!imageUrl && story.link) {
    try {
      const html = await fetchHomepage(story.link);
      const ogImage =
        html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
        html.match(/name="twitter:image"\s+content="([^"]+)"/i)?.[1] ||
        "";
      if (ogImage) imageUrl = ogImage;
    } catch {}
  }

  if (imageUrl) {
    try {
      await loadImageWithFallback(imgEl, imageUrl);
      imgEl.classList.remove("hidden");
    } catch {
      imgEl.classList.add("hidden");
    }
  } else {
    imgEl.classList.add("hidden");
  }

  imgEl.classList.remove("loading");
}

function parseUbitennis(html) {
  const metaTitle = html.match(/property="og:title"\s+content="([^"]+)"/i);
  const metaImage = html.match(/property="og:image"\s+content="([^"]+)"/i);
  const metaUrl = html.match(/property="og:url"\s+content="([^"]+)"/i);
  if (!metaTitle || !metaUrl) return null;
  return {
    title: decodeHtml(metaTitle[1]),
    image: metaImage ? metaImage[1] : "",
    link: metaUrl[1],
  };
}

function parseGazzetta(html) {
  const metaTitle = html.match(/property="og:title"\s+content="([^"]+)"/i);
  const metaImage = html.match(/property="og:image"\s+content="([^"]+)"/i);
  const metaUrl = html.match(/property="og:url"\s+content="([^"]+)"/i);
  if (!metaTitle || !metaUrl) return null;
  return {
    title: decodeHtml(metaTitle[1]),
    image: metaImage ? metaImage[1] : "",
    link: metaUrl[1],
  };
}

function parseCorriereDelloSport(html) {
  const metaTitle = html.match(/property="og:title"\s+content="([^"]+)"/i);
  const metaImage = html.match(/property="og:image"\s+content="([^"]+)"/i);
  const metaUrl = html.match(/property="og:url"\s+content="([^"]+)"/i);
  if (!metaTitle || !metaUrl) return null;
  return {
    title: decodeHtml(metaTitle[1]),
    image: metaImage ? metaImage[1] : "",
    link: metaUrl[1],
  };
}

function parseRepubblica(html) {
  const section = html.match(
    /class="block__overtitle">\s*Primo piano\s*<\/h1>[\s\S]*?<article class="entry[^"]*"[\s\S]*?data-sindex="1">([\s\S]*?)<\/article>/i
  );
  if (!section) return null;

  const chunk = section[1];
  const image = chunk.match(
    /<img[^>]+src="(https:\/\/www\.repstatic\.it\/content\/nazionale\/img\/[^"?]+\.jpg)"/i
  );
  const title = chunk.match(
    /class="entry__title"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/i
  );

  if (!image || !title || /\/video\//.test(title[1])) return null;

  return {
    image: image[1],
    title: decodeHtml(title[2]),
    link: title[1],
  };
}

function parseOpenOnline(html) {
  const card = html.match(
    /<div class="card-news-horizontal">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<div class="adv-banner/
  );
  const chunk = card ? card[1] : html;

  const image = chunk.match(
    /fetchpriority="high"[^>]*\ssrc="(https:\/\/static\.open\.online\/wp-content\/uploads\/[^"]+)"/i
  );
  const headline = chunk.match(
    /class="title-l"[\s\S]*?<a[^>]+href="([^"]+)"(?:\s+title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/i
  );

  if (!image || !headline) return null;

  const titleText = decodeHtml(headline[3] || headline[2] || "");

  return {
    image: image[1],
    link: headline[1],
    title: titleText,
  };
}

function parseCorriere(html) {
  const block = html.match(
    /<article class="media-news media-news--monstre"[\s\S]*?data-track-zone-name="B1"[\s\S]*?<\/article>/i
  );
  if (!block) return null;

  const chunk = block[0];
  const image = chunk.match(
    /data-full-src="(https:\/\/dimages2\.corriereobjects\.it\/uploads\/[^"]+\.jpe?g)"/i
  );
  const h2 = chunk.match(/<h2 class="media-news__title"[\s\S]*?<\/h2>/i);
  if (!h2 || !image) return null;

  const articleLink = h2[0].match(
    /href="(https:\/\/www\.corriere\.it\/[^"]+\.shtml)"[^>]*class="has-text-primary/
  );
  const mainLink = h2[0].match(
    /<a[^>]+href="(https:\/\/www\.corriere\.it\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i
  );
  if (!mainLink) return null;

  const title = decodeHtml(stripTags(mainLink[2]).replace(/\|$/, "").trim());
  const link = articleLink ? articleLink[1] : mainLink[1];

  return { image: image[1], link, title };
}

function parseIlMessaggero(html) {
  const main = html.match(/id="main-content"([\s\S]*?)<\/section>/i);
  const chunk = main ? main[1] : html;

  const article = chunk.match(
    /<article[^>]*html_base_top[^>]*>([\s\S]*?)<\/article>/i
  );
  if (!article) return null;

  const block = article[1];
  const image =
    block.match(
      /data-pagespeed-lazy-src="(https:\/\/statics\.cedscdn\.it\/photos\/[^"]+)"/i
    ) ||
    block.match(/src="(https:\/\/statics\.cedscdn\.it\/photos\/[^"]+)"/i);
  const linkMatch = block.match(
    /href="([^"]+)"[^>]*class="ml_primary_link"|class="ml_primary_link"[^>]+href="([^"]+)"/i
  );
  const titleMatch = block.match(
    /class="ml_primary_link"[^>]*>([\s\S]*?)<\/a>/i
  );

  const link = linkMatch[1] || linkMatch[2];
  if (!image || !link || !titleMatch) return null;

  return {
    image: image[1],
    link: toAbsoluteUrl(MESSAGGERO_HOME, link),
    title: decodeHtml(stripTags(titleMatch[1])),
  };
}

function loadImage(img, url) {
  return new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
}

async function loadImageWithFallback(img, url) {
  const candidates = [
    url,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  let lastError;
  for (const candidate of candidates) {
    try {
      await loadImage(img, candidate);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function loadColumn(columnId, homepage, parser) {
  const column = document.getElementById(columnId);
  const linkEl = column.querySelector(".story");
  const imgEl = column.querySelector(".story__img");
  const titleEl = column.querySelector(".story__title");

  imgEl.classList.add("loading");

  try {
    const html = await fetchHomepage(homepage);
    const story = parser(html);
    if (!story) throw new Error("Notizia non trovata");

    linkEl.href = story.link;
    titleEl.textContent = story.title;
    titleEl.classList.remove("error");
    imgEl.alt = story.title;

    if (story.image) {
      try {
        await loadImageWithFallback(imgEl, story.image);
        imgEl.classList.remove("hidden");
      } catch {
        imgEl.classList.add("hidden");
      }
    } else {
      imgEl.classList.add("hidden");
    }
    imgEl.classList.remove("loading");
  } catch {
    linkEl.href = homepage;
    imgEl.classList.add("hidden");
    imgEl.classList.remove("loading");
    titleEl.textContent = "Notizia non disponibile";
    titleEl.classList.add("error");
  }
}

function buildYahooChartUrl(symbol) {
  return `${YAHOO_CHART_BASE}${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
}

function buildStooqQuoteUrl(symbol) {
  return `${STOOQ_QUOTE_BASE}?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
}

function parseStooqQuoteCsv(text) {
  const line = String(text).trim().split(/\r?\n/)[0] || "";
  const parts = line.split(",");
  if (parts.length < 8) return null;

  const date = parts[1];
  const time = parts[2];
  const open = Number.parseFloat(parts[3]);
  const close = Number.parseFloat(parts[6]);

  if (!date || !time || !Number.isFinite(open) || !Number.isFinite(close)) {
    return null;
  }

  return { date, time, open, close };
}

function currencySymbol(currency) {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return `${currency} `;
}

function formatIsoDate(timestampSeconds) {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

function parseYahooChart(text) {
  const data = JSON.parse(text);
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const currency = result?.meta?.currency || "USD";

  const points = timestamps
    .map((ts, i) => ({ ts, close: closes[i] }))
    .filter((x) => x.ts && Number.isFinite(x.close));

  return { currency, points };
}

function sparklineSvg(values, stroke) {
  const width = 100;
  const height = 40;
  const padding = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i * (width - 2 * padding)) / (values.length - 1) + padding;
      const y =
        height -
        padding -
        ((v - min) * (height - 2 * padding)) / range;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

async function loadStockCard(articleId, label, yahooSymbol, stooqSymbol) {
  const article = document.getElementById(articleId);
  if (!article) return;
  const priceEl = article.querySelector(".stock__price");
  const changeEl = article.querySelector(".stock__change");
  const dateEl = article.querySelector(".stock__date");
  const chartEl = article.querySelector(".stock__chart");

  try {
    const jsonText = await fetchTextWithFallback(buildYahooChartUrl(yahooSymbol));
    const { currency, points } = parseYahooChart(jsonText);
    const recent = points.slice(-30);
    if (recent.length < 2) throw new Error("Dati insufficienti");

    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    const diff = last.close - prev.close;
    const pct = (diff / prev.close) * 100;

    priceEl.textContent = `${currencySymbol(currency)}${last.close.toFixed(2)}`;
    changeEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
    changeEl.classList.remove("stock__change--up", "stock__change--down");
    changeEl.classList.add(pct >= 0 ? "stock__change--up" : "stock__change--down");
    dateEl.textContent = `Chiusura ${formatIsoDate(last.ts)} · Yahoo`;

    const stroke = pct >= 0 ? "#40d17c" : "#ff6b6b";
    chartEl.innerHTML = sparklineSvg(recent.map((x) => x.close), stroke);
  } catch {
    try {
      const csv = await fetchTextWithFallback(buildStooqQuoteUrl(stooqSymbol));
      const quote = parseStooqQuoteCsv(csv);
      if (!quote) throw new Error("CSV non valido");

      const diff = quote.close - quote.open;
      const pct = (diff / quote.open) * 100;

      priceEl.textContent = `$${quote.close.toFixed(2)}`;
      changeEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      changeEl.classList.remove("stock__change--up", "stock__change--down");
      changeEl.classList.add(pct >= 0 ? "stock__change--up" : "stock__change--down");
      dateEl.textContent = `Oggi ${quote.date} · Stooq`;
      chartEl.innerHTML = "";
    } catch {
      priceEl.textContent = `${label}: dati non disponibili`;
      changeEl.textContent = "";
      dateEl.textContent = "";
      chartEl.innerHTML = "";
    }
  }
}

async function fetchCityTemp(city) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Risposta non valida");
  const data = await res.json();
  return Math.round(data.current.temperature_2m);
}

function pickRandomCities(count) {
  const pool = [...RANDOM_POOL];
  const picked = [];

  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }

  return picked;
}

async function getCityTemp(city) {
  if (tempCache.has(city.name)) return tempCache.get(city.name);
  const temp = await fetchCityTemp(city);
  tempCache.set(city.name, temp);
  return temp;
}

function cityCardHtml(city, extraClass = "") {
  const isHeartCity = city.name === "Santa Croce di Magliano";
  const nameWithHeart = isHeartCity ? `${city.name} ❤️` : city.name;
  return `
    <li class="city city--loading ${extraClass}">
      <p class="city__name">${nameWithHeart}</p>
      <p class="city__temp" aria-live="polite">…</p>
    </li>
  `;
}

async function fillCityCard(card, city) {
  const tempEl = card.querySelector(".city__temp");
  const isHeartCity = city.name === "Santa Croce di Magliano";
  const nameWithHeart = isHeartCity ? `${city.name} ❤️` : city.name;
  card.querySelector(".city__name").textContent = nameWithHeart;
  tempEl.textContent = "…";
  card.classList.add("city--loading");
  card.classList.remove("city--error");

  try {
    tempEl.textContent = `${await getCityTemp(city)}°`;
    card.classList.remove("city--loading");
  } catch {
    tempEl.textContent = "—";
    card.classList.add("city--error");
    card.classList.remove("city--loading");
  }
}

function restartTimerAnimation() {
  timerRingEl.style.animation = "none";
  timerRingEl.offsetHeight;
  timerRingEl.style.animation = "";
}

async function rotateRandomCities() {
  const randomCities = pickRandomCities(RANDOM_COUNT);
  displayedCities = [...FIXED_CITIES, ...randomCities];
  const cards = citiesEl.querySelectorAll(".city--random");

  updateItalyMap(displayedCities);
  await Promise.all(
    randomCities.map((city, index) => fillCityCard(cards[index], city))
  );
}

async function initCities() {
  const randomCities = pickRandomCities(RANDOM_COUNT);
  displayedCities = [...FIXED_CITIES, ...randomCities];

  citiesEl.innerHTML =
    FIXED_CITIES.map((city) => cityCardHtml(city, "city--fixed")).join("") +
    randomCities.map((city) => cityCardHtml(city, "city--random")).join("");

  updateItalyMap(displayedCities);

  const cards = citiesEl.querySelectorAll(".city");
  await Promise.all(
    displayedCities.map((city, index) => fillCityCard(cards[index], city))
  );
}

function onTimerTick() {
  secondsLeft -= 1;

  if (secondsLeft <= 0) {
    secondsLeft = ROTATE_SECONDS;
    restartTimerAnimation();
    rotateRandomCities();
  }

  timerValueEl.textContent = String(secondsLeft);
}

function startCityRotation() {
  secondsLeft = ROTATE_SECONDS;
  timerValueEl.textContent = String(secondsLeft);
  initCities();
  setInterval(onTimerTick, 1000);
}

let notizieLoaded = false;
let sportLoaded = false;
let borsaLoaded = false;

function ensureNotizieLoaded() {
  if (notizieLoaded) return;
  notizieLoaded = true;
  loadColumn("repubblica", REPUBBLICA_HOME, parseRepubblica);
  loadColumn("open", OPEN_ONLINE_HOME, parseOpenOnline);
  loadColumn("corriere", CORRIERE_HOME, parseCorriere);
  loadColumn("messaggero", MESSAGGERO_HOME, parseIlMessaggero);
}

function ensureSportLoaded() {
  if (sportLoaded) return;
  sportLoaded = true;
  loadSportColumn("ubitennis", UBITENNIS_HOME, parseUbitennis);
  loadSportColumn("gazzetta", GAZZETTA_HOME, parseGazzetta);
  loadSportColumn(
    "corrieredellosport",
    CORRIEREDELLOSPORT_HOME,
    parseCorriereDelloSport
  );
}

function ensureBorsaLoaded() {
  if (borsaLoaded) return;
  borsaLoaded = true;
  loadStockCard("stock-avgo", "AVGO", "AVGO", "avgo.us");
  loadStockCard("stock-msft", "Microsoft", "MSFT", "msft.us");
}

let testInit = false;
function ensureTestInit() {
  if (testInit) return;
  testInit = true;

  const stooqBtn = document.getElementById("test-stooq");
  const yahooBtn = document.getElementById("test-yahoo");
  const stooqOut = document.getElementById("test-stooq-out");
  const yahooOut = document.getElementById("test-yahoo-out");

  if (stooqBtn && stooqOut) {
    stooqBtn.addEventListener("click", async () => {
      stooqOut.textContent = "Caricamento…";
      try {
        const txt = await fetchTextWithFallback(buildStooqQuoteUrl("msft.us"));
        stooqOut.textContent = txt.slice(0, 400);
      } catch (e) {
        stooqOut.textContent = String(e?.message || e);
      }
    });
  }

  if (yahooBtn && yahooOut) {
    yahooBtn.addEventListener("click", async () => {
      yahooOut.textContent = "Caricamento…";
      try {
        const txt = await fetchTextWithFallback(buildYahooChartUrl("MSFT"));
        yahooOut.textContent = txt.slice(0, 400);
      } catch (e) {
        yahooOut.textContent = String(e?.message || e);
      }
    });
  }
}

function initSidebarNavigation() {
  const navLinks = document.querySelectorAll(".sidebar__link");
  const sections = document.querySelectorAll(".page-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const pageId = link.getAttribute("data-page");

      // Update active link
      navLinks.forEach((l) => {
        l.classList.remove("active");
        l.removeAttribute("aria-current");
      });
      link.classList.add("active");
      link.setAttribute("aria-current", "page");

      // Update active section
      sections.forEach((section) => {
        if (section.id === `page-${pageId}`) {
          section.classList.add("active");
        } else {
          section.classList.remove("active");
        }
      });

      if (pageId === "notizie") ensureNotizieLoaded();
      if (pageId === "sport") ensureSportLoaded();
      if (pageId === "borsa") ensureBorsaLoaded();
      if (pageId === "test") ensureTestInit();
    });
  });
}

initItalyMapShape();
startCityRotation();
initSidebarNavigation();
