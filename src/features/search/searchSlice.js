import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_FAVORIT_API_URL || 'http://api.favorit-parts.ru/hs/hsprice/';
const API_KEY = import.meta.env.VITE_FAVORIT_API_KEY || '';

function normalizeGoods(payload) {
  if (payload?.error) throw new Error(Array.isArray(payload.error) ? payload.error.join(', ') : payload.error);
  const goods = payload?.goods ?? payload;
  if (Array.isArray(goods)) return goods.filter(item => item && Object.keys(item).length > 0 && (item.number || item.brand || item.name));
  if (goods && typeof goods === 'object' && (goods.number || goods.brand || goods.name)) return [goods];
  return [];
}

async function requestGoods({ number, brand, signal }) {
  if (!API_KEY) throw new Error('Не задан ключ API. Добавьте VITE_FAVORIT_API_KEY в файл .env.');
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('number', number);
  url.searchParams.set('info', 'on');
  if (brand) {
    url.searchParams.set('brand', brand);
    url.searchParams.set('analogues', 'on');
  }
  let response;
  try { response = await fetch(url, { signal, headers: { Accept: 'application/json' } }); }
  catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Не удалось связаться с API. Проверьте интернет, адрес API и доступность CORS.');
  }
  if (!response.ok) throw new Error(`API вернул ошибку HTTP ${response.status}.`);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('API вернул ответ в неожиданном формате.'); }
  return normalizeGoods(payload);
}

export const fetchBrands = createAsyncThunk('search/fetchBrands', requestGoods);
export const fetchOffers = createAsyncThunk('search/fetchOffers', requestGoods);

const initialState = { number: '', brands: [], offers: [], selectedBrand: null, brandsStatus: 'idle', offersStatus: 'idle', error: null, offerError: null };
const searchSlice = createSlice({
  name: 'search', initialState,
  reducers: {
    setNumber(state, action) {
      state.number = action.payload;
      state.brands = [];
      state.offers = [];
      state.selectedBrand = null;
      state.brandsStatus = 'idle';
      state.offersStatus = 'idle';
      state.error = null;
      state.offerError = null;
    },
    clearSearch() { return initialState; }
  },
  extraReducers(builder) {
    builder
      .addCase(fetchBrands.pending, (state) => { state.brandsStatus = 'loading'; state.brands = []; state.offers = []; state.selectedBrand = null; state.error = null; state.offerError = null; })
      .addCase(fetchBrands.fulfilled, (state, action) => { state.brandsStatus = 'succeeded'; state.brands = [...new Map(action.payload.filter(item => item.brand).map(item => [item.brand.trim().toLocaleLowerCase('ru'), item])).values()]; })
      .addCase(fetchBrands.rejected, (state, action) => { if (action.meta.aborted) return; state.brandsStatus = 'failed'; state.error = action.error.message || 'Не удалось выполнить поиск.'; })
      .addCase(fetchOffers.pending, (state, action) => { state.selectedBrand = action.meta.arg.brand; state.offersStatus = 'loading'; state.offers = []; state.offerError = null; })
      .addCase(fetchOffers.fulfilled, (state, action) => { state.offersStatus = 'succeeded'; state.offers = action.payload; })
      .addCase(fetchOffers.rejected, (state, action) => { if (action.meta.aborted) return; state.offersStatus = 'failed'; state.offerError = action.error.message || 'Не удалось загрузить предложения.'; });
  }
});
export const { setNumber, clearSearch } = searchSlice.actions;
export default searchSlice.reducer;
