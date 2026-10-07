// ============ Ссылки на элементы ============
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const geoBtn = document.getElementById('geo-btn');
const hint = document.getElementById('hint');

const cityEl = document.getElementById('city');
const iconEl = document.getElementById('icon');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const feelsEl = document.getElementById('feels');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');

const forecastListEl = document.getElementById('forecast-list');

// ============ Словарь погодных кодов WMO ============
const weatherCodes = {
  0:  { desc: 'Ясно',                    icon: '☀️' },
  1:  { desc: 'Преимущественно ясно',    icon: '🌤️' },
  2:  { desc: 'Переменная облачность',   icon: '⛅' },
  3:  { desc: 'Пасмурно',                icon: '☁️' },
  45: { desc: 'Туман',                   icon: '🌫️' },
  48: { desc: 'Изморозь',                icon: '🌫️' },
  51: { desc: 'Слабая морось',           icon: '🌦️' },
  53: { desc: 'Морось',                  icon: '🌦️' },
  55: { desc: 'Сильная морось',          icon: '🌧️' },
  61: { desc: 'Небольшой дождь',         icon: '🌧️' },
  63: { desc: 'Дождь',                   icon: '🌧️' },
  65: { desc: 'Сильный дождь',           icon: '🌧️' },
  71: { desc: 'Небольшой снег',          icon: '🌨️' },
  73: { desc: 'Снег',                    icon: '❄️' },
  75: { desc: 'Сильный снег',            icon: '❄️' },
  80: { desc: 'Ливень',                  icon: '🌦️' },
  81: { desc: 'Сильный ливень',          icon: '🌧️' },
  82: { desc: 'Очень сильный ливень',    icon: '⛈️' },
  95: { desc: 'Гроза',                   icon: '⛈️' },
  96: { desc: 'Гроза с градом',          icon: '⛈️' },
  99: { desc: 'Сильная гроза с градом',  icon: '⛈️' },
};

function getWeatherInfo(code) {
  return weatherCodes[code] || { desc: 'Неизвестно', icon: '❓' };
}

// ============ Геокодинг: имя → координаты ============
async function geocode(cityName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка геокодинга');

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('Город не найден');
  }

  const { latitude, longitude, name, country } = data.results[0];
  return { lat: latitude, lon: longitude, name, country };
}

// ============ Обратный геокодинг: координаты → название ============
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Ошибка обратного геокодинга');

    const data = await res.json();
    const city = data.city || data.locality || data.principalSubdivision;
    const country = data.countryName;

    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    return 'Моё местоположение';
  } catch (err) {
    console.warn('Обратный геокодинг недоступен:', err);
    return 'Моё местоположение';
  }
}

// ============ Прогноз: координаты → погода ============
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
              `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
              `&forecast_days=5` +
              `&wind_speed_unit=ms&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка получения погоды');

  const data = await res.json();
  return { current: data.current, daily: data.daily };
}

// ============ Рендер текущей погоды ============
function renderWeather({ cityName, current }) {
  const info = getWeatherInfo(current.weather_code);

  cityEl.textContent = cityName;
  iconEl.textContent = info.icon;
  tempEl.textContent = `${Math.round(current.temperature_2m)}°C`;
  descEl.textContent = info.desc;

  feelsEl.textContent = `${Math.round(current.apparent_temperature)}°C`;
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windEl.textContent = `${current.wind_speed_10m.toFixed(1)} м/с`;
}

// ============ Рендер прогноза ============
function formatDay(dateStr, index) {
  if (index === 0) return 'Сегодня';
  const date = new Date(dateStr);
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
}

function renderForecast(daily) {
  forecastListEl.innerHTML = '';

  daily.time.forEach((dateStr, i) => {
    const info = getWeatherInfo(daily.weather_code[i]);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);

    const dayEl = document.createElement('div');
    dayEl.className = 'forecast__day';
    dayEl.innerHTML = `
      <div class="forecast__name">${formatDay(dateStr, i)}</div>
      <div class="forecast__icon">${info.icon}</div>
      <div class="forecast__temp">
        <div class="forecast__temp-max">${max > 0 ? '+' : ''}${max}°</div>
        <div class="forecast__temp-min">${min > 0 ? '+' : ''}${min}°</div>
      </div>
    `;
    forecastListEl.appendChild(dayEl);
  });
}

// ============ Общая функция загрузки по координатам ============
async function loadByCoords(lat, lon, cityName) {
  const { current, daily } = await fetchWeather(lat, lon);

  renderWeather({ cityName, current });
  renderForecast(daily);
}

// ============ Обработка формы ============
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const query = input.value.trim();
  if (!query) {
    hint.textContent = '⚠️ Введите название города';
    return;
  }

  hint.textContent = '⏳ Загружаем...';

  try {
    const { lat, lon, name, country } = await geocode(query);
    await loadByCoords(lat, lon, country ? `${name}, ${country}` : name);

    hint.textContent = '✅ Данные обновлены';
  } catch (err) {
    handleError(err);
  }
});

// ============ Обработка геолокации ============
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    hint.textContent = '❌ Геолокация не поддерживается браузером';
    return;
  }

  hint.textContent = '📡 Определяем местоположение...';
  geoBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const cityName = await reverseGeocode(latitude, longitude);
        await loadByCoords(latitude, longitude, cityName);
        hint.textContent = '✅ Показана погода для вашего местоположения';
      } catch (err) {
        handleError(err);
      } finally {
        geoBtn.disabled = false;
      }
    },
    (error) => {
      geoBtn.disabled = false;

      // Расшифровка кодов ошибок геолокации
      const messages = {
        1: '🚫 Вы запретили доступ к геолокации',
        2: '📡 Не удалось определить местоположение',
        3: '⏱️ Превышено время ожидания',
      };
      hint.textContent = messages[error.code] || '❌ Ошибка геолокации';
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000, // кешируем позицию на 1 минуту
    }
  );
});

// ============ Единая обработка ошибок ============
function handleError(err) {
  console.error('Подробности:', err);

  if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
    hint.textContent = '🌐 Нет связи с API. Проверьте интернет или VPN.';
  } else if (err.message === 'Город не найден') {
    hint.textContent = '🤷 Город не найден. Попробуйте другое название.';
  } else {
    hint.textContent = `❌ Ошибка: ${err.message}`;
  }
}