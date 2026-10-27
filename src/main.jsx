import React, { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useDispatch, useSelector } from 'react-redux';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { store } from './app/store';
import { fetchBrands, fetchOffers, setNumber, clearSearch } from './features/search/searchSlice';

function Spinner({ label }) { return <div className="state-card"><span className="spinner-border spinner-border-sm" role="status"/><span>{label}</span></div>; }
function EmptyState({ title, detail }) { return <div className="state-card empty-state"><span className="empty-icon">⌕</span><strong>{title}</strong>{detail && <span>{detail}</span>}</div>; }
function ErrorState({ message }) { return <div className="alert alert-danger error-box" role="alert"><strong>Не удалось выполнить запрос</strong><span>{message}</span></div>; }
function money(value) { const amount = Number(value); return value !== null && value !== undefined && value !== '' && Number.isFinite(amount) ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(amount) : '—'; }
function formatDate(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date); }

function SearchApp() {
  const dispatch = useDispatch();
  const { number, brands, offers, selectedBrand, brandsStatus, offersStatus, error, offerError } = useSelector(s => s.search);
  const brandRequest = useRef(null);
  const offerRequest = useRef(null);
  const searchNumber = number.trim();

  useEffect(() => {
    if (!searchNumber) { dispatch(clearSearch()); return; }
    const timer = setTimeout(() => {
      brandRequest.current?.abort(); offerRequest.current?.abort();
      brandRequest.current = dispatch(fetchBrands({ number: searchNumber }));
    }, 450);
    return () => clearTimeout(timer);
  }, [searchNumber, dispatch]);

  const rows = useMemo(() => {
    const result = [];
    const add = (item, source) => {
      const warehouses = Array.isArray(item?.warehouses) ? item.warehouses : [];
      if (!warehouses.length) result.push({ item, warehouse: null, source });
      else warehouses.forEach(warehouse => result.push({ item, warehouse, source }));
    };
    offers.forEach(item => add(item, 'offer'));
    offers.forEach(item => (Array.isArray(item?.analogues) ? item.analogues : []).forEach(item => add(item, 'analogue')));
    return result;
  }, [offers]);

  const onSelectBrand = brand => {
    offerRequest.current?.abort();
    offerRequest.current = dispatch(fetchOffers({ number: searchNumber, brand }));
  };
  const onClear = () => { brandRequest.current?.abort(); offerRequest.current?.abort(); dispatch(clearSearch()); };

  return <main className="page-shell">
    <header className="topbar"><a className="brandmark" href="#" aria-label="Favorit Parts"><span className="brandmark-symbol">F</span><span>FAVORIT<span className="brandmark-light">PARTS</span></span></a><div className="topbar-note"><span className="status-dot"/> Поиск по каталогу поставщиков</div></header>
    <section className="hero"><div className="eyebrow">ПОДБОР АВТОЗАПЧАСТЕЙ</div><h1>Найдите нужную<br/><span>деталь и её аналоги</span></h1><p>Укажите артикул — покажем производителей, цены и наличие на складах.</p>
      <div className="search-box"><span className="search-icon" aria-hidden="true">⌕</span><input aria-label="Артикул детали" value={number} onChange={e => { brandRequest.current?.abort(); offerRequest.current?.abort(); dispatch(setNumber(e.target.value)); }} placeholder="Например, 01089 или 7160500039S" autoComplete="off"/><button className="clear-button" onClick={onClear} aria-label="Очистить" disabled={!number}>×</button></div>
      <div className="search-hint"><span>↳</span> Поиск начнётся автоматически</div>
    </section>
    <section className="results-layout">
      <div className="section-head"><div><div className="eyebrow">ШАГ 1</div><h2>Выберите производителя</h2></div>{brands.length > 0 && brandsStatus === 'succeeded' && <span className="count-pill">{brands.length} {brands.length === 1 ? 'бренд' : 'бренда'}</span>}</div>
      {!searchNumber ? <EmptyState title="Введите артикул детали" detail="Начните с номера запчасти, чтобы увидеть доступные бренды."/> : brandsStatus === 'loading' ? <Spinner label="Ищем производителей…"/> : error ? <ErrorState message={error}/> : brandsStatus === 'succeeded' && brands.length === 0 ? <EmptyState title="По этому артикулу ничего не найдено" detail="Проверьте номер и попробуйте ещё раз."/> : brands.length > 0 ? <div className="brand-grid">{brands.map((item, index) => { const brand = item.brand || 'Производитель не указан'; return <button key={`${brand}-${index}`} className={`brand-card ${selectedBrand === brand ? 'selected' : ''}`} onClick={() => onSelectBrand(brand)}><span className="brand-card-top"><span className="brand-initial">{brand.slice(0, 1).toUpperCase()}</span><span className="brand-arrow">↗</span></span><strong>{brand}</strong><span className="brand-number">{item.number || searchNumber}</span>{selectedBrand === brand && <span className="selected-mark">Выбран</span>}</button> })}</div> : null}
    </section>
    {(selectedBrand || offersStatus === 'loading') && <section className="offers-section"><div className="section-head"><div><div className="eyebrow">ШАГ 2 · {selectedBrand}</div><h2>Предложения и аналоги</h2></div>{offersStatus === 'succeeded' && rows.length > 0 && <span className="count-pill">{rows.length} предложений</span>}</div>
      {offersStatus === 'loading' ? <Spinner label="Загружаем цены и наличие…"/> : offerError ? <ErrorState message={offerError}/> : offersStatus === 'succeeded' && rows.length === 0 ? <EmptyState title="Предложений пока нет" detail="Для этого производителя не найдено доступных позиций."/> : rows.length > 0 && <div className="offers-card"><div className="offer-table-wrap"><table className="table offer-table"><thead><tr><th>Деталь / производитель</th><th>Склад</th><th>Наличие</th><th className="price-col">Цена</th></tr></thead><tbody>{rows.map(({item, warehouse, source}, index) => <tr key={`${item.goodsID || item.number}-${warehouse?.id || index}-${index}`}><td><div className="part-title">{item.name || item.number || 'Запчасть'}</div><div className="part-meta"><span>{item.brand || selectedBrand}</span><span className="meta-divider">·</span><span>Арт. {item.number || searchNumber}</span>{source === 'analogue' && <span className="analogue-tag">АНАЛОГ</span>}</div></td><td><span className="warehouse-name">{warehouse?.code || warehouse?.id || '—'}</span>{warehouse?.shipmentDate && <span className="shipment-date">Отгрузка {formatDate(warehouse.shipmentDate)}</span>}</td><td><span className={`stock ${Number(warehouse?.stock ?? item.count) > 0 ? '' : 'stock-empty'}`}><i/>{warehouse?.stock ?? item.count ?? 0} шт.</span></td><td className="price-col"><strong>{money(warehouse?.price)}</strong></td></tr>)}</tbody></table></div><div className="table-footnote">Цены указаны по конкретным складам. Данные актуальны на момент запроса.</div></div>}
    </section>}
    <footer><span>FAVORIT PARTS</span><span>Подбор запчастей и аналогов</span></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Provider store={store}><SearchApp/></Provider></React.StrictMode>);
