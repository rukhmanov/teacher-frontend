import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    road?: string;
    house_number?: string;
  };
}

interface NominatimResponse extends Array<AddressSuggestion> {}

@Component({
  selector: 'app-address-suggest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="address-suggest-container">
      <input
        #addressInput
        type="text"
        class="form-control"
        [(ngModel)]="inputValue"
        (input)="onInputChange()"
        (focus)="showSuggestions = true"
        (blur)="onBlur()"
        [placeholder]="placeholder"
        autocomplete="off" />
      <div *ngIf="showSuggestions && suggestions.length > 0" class="suggestions-list">
        <div
          *ngFor="let suggestion of suggestions; let i = index"
          class="suggestion-item"
          [class.active]="i === selectedIndex"
          (mousedown)="selectSuggestion(suggestion)"
          (mouseenter)="selectedIndex = i">
          <i class="fas fa-map-marker-alt"></i>
          <span [innerHTML]="highlightMatch(suggestion.display_name, inputValue)"></span>
        </div>
      </div>
      <div *ngIf="showSuggestions && isLoading" class="suggestions-loading">
        <p>Поиск адресов...</p>
      </div>
      <div *ngIf="selectedCoordinates && safeMapUrl" class="map-container">
        <iframe
          [src]="safeMapUrl"
          width="100%"
          height="300"
          frameborder="0"
          scrolling="no"
          marginheight="0"
          marginwidth="0"
          title="Карта с выбранным адресом">
        </iframe>
        <div class="map-link-container">
          <a [href]="'https://www.openstreetmap.org/?mlat=' + selectedCoordinates.lat + '&mlon=' + selectedCoordinates.lon + '&zoom=15'" 
             target="_blank" 
             class="map-link">
            <i class="fas fa-external-link-alt"></i> Открыть на карте
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .address-suggest-container {
      position: relative;
      width: 100%;
    }

    .suggestions-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 4px;
    }

    .suggestion-item {
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: background-color 0.2s;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      &:hover,
      &.active {
        background-color: #f5f5f5;
      }

      i {
        color: var(--primary-orange, #ff6b6b);
        font-size: 0.9rem;
        flex-shrink: 0;
      }

      span {
        flex: 1;
        color: var(--text-dark, #333);
        line-height: 1.4;
      }
    }

    .suggestions-loading {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 4px;
      z-index: 1000;
      text-align: center;
      color: #666;
      font-size: 14px;
    }

    .suggestions-error {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 4px;
      z-index: 1000;
      text-align: center;
      color: #856404;
      font-size: 13px;

      a {
        color: var(--primary-orange, #ff6b6b);
        text-decoration: underline;
      }
    }

    .highlight {
      font-weight: 600;
      color: var(--primary-orange, #ff6b6b);
    }

    .map-container {
      margin-top: 16px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #ddd;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .map-container iframe {
      display: block;
      border: none;
    }

    .map-link-container {
      padding: 12px 16px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      text-align: center;
    }

    .map-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-orange, #ff6b6b);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;

      &:hover {
        color: var(--primary-orange-dark, #e55555);
        text-decoration: underline;
      }

      i {
        font-size: 12px;
      }
    }
  `]
})
export class AddressSuggestComponent implements OnInit {
  @ViewChild('addressInput', { static: false }) addressInput!: ElementRef<HTMLInputElement>;
  @Input() placeholder: string = 'Введите адрес';
  @Input() value: string = '';
  @Output() addressSelected = new EventEmitter<{
    address: string;
    coordinates?: { lat: number; lon: number };
    fullData?: any;
  }>();
  
  inputValue: string = '';
  suggestions: AddressSuggestion[] = [];
  showSuggestions: boolean = false;
  selectedIndex: number = -1;
  isLoading: boolean = false;
  selectedCoordinates: { lat: number; lon: number } | null = null;
  safeMapUrl: SafeResourceUrl | null = null;
  // Используем OpenStreetMap Nominatim API - бесплатно, без API ключа
  private apiUrl = 'https://nominatim.openstreetmap.org/search';
  private searchSubject = new Subject<string>();

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.inputValue = this.value;
    
    // Настраиваем debounce для поиска
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((query: string) => {
        if (query.length < 2) {
          return new Observable<NominatimResponse>(observer => {
            observer.next([]);
            observer.complete();
          });
        }
        return this.searchAddresses(query);
      })
    ).subscribe({
      next: (response) => {
        console.log('Nominatim raw response:', response);
        console.log('Response length:', response?.length || 0);
        
        // Если ответ пустой, пробуем альтернативный поиск
        if (!response || response.length === 0) {
          console.warn('No results from Nominatim, trying alternative search...');
          // Пробуем поиск с улучшенным форматом запроса
          this.tryAlternativeSearch(this.inputValue.trim()).subscribe({
            next: (altResponse) => {
              console.log('Alternative search response:', altResponse);
              if (altResponse && altResponse.length > 0) {
                // Фильтруем только адреса в России и сортируем по релевантности
                const russianResults = altResponse
                  .filter(item => {
                    const country = item.address?.country?.toLowerCase();
                    const displayName = item.display_name?.toLowerCase() || '';
                    return country === 'россия' || 
                           country === 'russia' || 
                           displayName.includes('россия') ||
                           displayName.includes('russia') ||
                           !country;
                  })
                  .sort((a, b) => {
                    // Сортируем по важности (importance) - чем выше, тем лучше
                    return (b.importance || 0) - (a.importance || 0);
                  });
                
                // Приоритет результатам с номером дома в адресе
                const withHouseNumber = russianResults.filter(item => 
                  item.address?.house_number || 
                  item.display_name?.match(/\d+[а-я]?/i)
                );
                const withoutHouseNumber = russianResults.filter(item => 
                  !item.address?.house_number && 
                  !item.display_name?.match(/\d+[а-я]?/i)
                );
                
                this.suggestions = [...withHouseNumber, ...withoutHouseNumber].slice(0, 5);
              } else {
                this.suggestions = [];
              }
              this.isLoading = false;
              this.selectedIndex = -1;
            },
            error: (err) => {
              console.error('Alternative search error:', err);
              this.isLoading = false;
              this.suggestions = [];
            }
          });
          return;
        }

        // Фильтруем результаты - оставляем только адреса в России
        const filtered = (response || []).filter(item => {
          const country = item.address?.country?.toLowerCase();
          const displayName = item.display_name?.toLowerCase() || '';
          // Проверяем, что это адрес в России
          return country === 'россия' || 
                 country === 'russia' || 
                 displayName.includes('россия') ||
                 displayName.includes('russia') ||
                 !country; // Если страна не указана, но countrycodes=ru был в запросе, оставляем
        });
        
        // Проверяем, есть ли в запросе номер дома
        const hasHouseNumber = /\d+[а-я]?/i.test(this.inputValue.trim());
        
        // Сортируем: сначала результаты с номером дома, потом без
        const sorted = filtered.sort((a, b) => {
          const aHasHouse = a.address?.house_number || /\d+[а-я]?/i.test(a.display_name || '');
          const bHasHouse = b.address?.house_number || /\d+[а-я]?/i.test(b.display_name || '');
          
          if (aHasHouse && !bHasHouse) return -1;
          if (!aHasHouse && bHasHouse) return 1;
          
          // Если оба с номером или оба без, сортируем по важности
          return (b.importance || 0) - (a.importance || 0);
        });
        
        this.suggestions = sorted.slice(0, 5); // Берем первые 5
        this.isLoading = false;
        this.selectedIndex = -1;
        console.log('Filtered suggestions count:', this.suggestions.length);
        console.log('Has house number in query:', hasHouseNumber);
        if (this.suggestions.length > 0 && hasHouseNumber) {
          // Проверяем, есть ли в результатах номер дома
          const foundWithHouse = this.suggestions.some(s => 
            s.address?.house_number || /\d+[а-я]?/i.test(s.display_name || '')
          );
          if (!foundWithHouse) {
            console.warn('House number in query but not found in results. Showing nearest address.');
          }
        }
        if (this.suggestions.length === 0 && response && response.length > 0) {
          console.warn('All results were filtered out. Original results:', response);
          // Если все отфильтровались, показываем первые результаты
          this.suggestions = response.slice(0, 5);
        }
      },
      error: (error) => {
        console.error('Error fetching addresses:', error);
        console.error('Error details:', error.error || error.message);
        console.error('Error status:', error.status);
        this.isLoading = false;
        this.suggestions = [];
      }
    });
  }

  onInputChange() {
    const query = this.inputValue.trim();
    
    if (query.length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      this.isLoading = false;
      return;
    }

    console.log('Searching for address:', query);
    this.isLoading = true;
    this.showSuggestions = true;
    this.searchSubject.next(query);
  }

  onBlur() {
    // Задержка, чтобы клик по элементу успел сработать
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  selectSuggestion(suggestion: AddressSuggestion) {
    this.inputValue = suggestion.display_name;
    this.showSuggestions = false;
    this.suggestions = [];

    const result: any = {
      address: suggestion.display_name,
      fullData: suggestion.address
    };

    // Добавляем координаты
    if (suggestion.lat && suggestion.lon) {
      const lat = parseFloat(suggestion.lat);
      const lon = parseFloat(suggestion.lon);
      result.coordinates = { lat, lon };
      this.selectedCoordinates = { lat, lon };
      // Генерируем URL для OpenStreetMap с маркером
      const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
      this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(mapUrl);
    } else {
      this.selectedCoordinates = null;
      this.safeMapUrl = null;
    }

    this.addressSelected.emit(result);
  }

  private searchAddresses(query: string): Observable<NominatimResponse> {
    // Очищаем и нормализуем запрос
    const cleanedQuery = this.cleanAndNormalizeQuery(query);
    
    // OpenStreetMap Nominatim API - бесплатный, не требует API ключа
    // Ограничение: максимум 1 запрос в секунду (соблюдаем через debounce)
    const params = new URLSearchParams({
      q: cleanedQuery,
      format: 'json',
      addressdetails: '1',
      limit: '10', // Увеличиваем лимит для лучших результатов
      countrycodes: 'ru', // Только адреса в России
      'accept-language': 'ru',
      dedupe: '1', // Убираем дубликаты
      polygon: '0', // Не нужны полигоны
      extratags: '0' // Не нужны дополнительные теги
    });

    // Браузер не позволяет устанавливать User-Agent и Referer через HttpHeaders
    // Nominatim работает и без них, но может быть медленнее
    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    const url = `${this.apiUrl}?${params.toString()}`;
    console.log('Original query:', query);
    console.log('Cleaned query:', cleanedQuery);
    console.log('Sending request to Nominatim:', url);
    
    return this.http.get<NominatimResponse>(url, { headers });
  }

  private tryAlternativeSearch(query: string): Observable<NominatimResponse> {
    // Пробуем более простой запрос без "Россия" в конце
    let simpleQuery = query.replace(/,\s*Россия\s*$/i, '').trim();
    
    // Извлекаем компоненты адреса: город, улица, номер дома
    const houseNumberMatch = simpleQuery.match(/(\d+[а-я]?)$/i);
    const houseNumber = houseNumberMatch ? houseNumberMatch[1] : null;
    
    // Убираем номер дома из запроса для поиска улицы
    let queryWithoutHouse = simpleQuery.replace(/\s+\d+[а-я]?$/i, '').trim();
    
    // Извлекаем город и улицу
    const cityMatch = queryWithoutHouse.match(/^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/);
    const streetMatch = queryWithoutHouse.match(/(?:ул|улица|пр|проспект|пер|переулок)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i);
    
    // Формируем несколько вариантов запроса для лучшего поиска
    const queries: string[] = [];
    
    if (cityMatch && streetMatch && houseNumber) {
      // Вариант 1: Город, улица, номер дома (точный формат)
      queries.push(`${cityMatch[1]}, улица ${streetMatch[1]}, ${houseNumber}, Россия`);
      // Вариант 2: Улица, номер дома, город
      queries.push(`улица ${streetMatch[1]}, ${houseNumber}, ${cityMatch[1]}, Россия`);
      // Вариант 3: Город, улица, номер дома (без слова "улица")
      queries.push(`${cityMatch[1]}, ${streetMatch[1]}, ${houseNumber}, Россия`);
    }
    
    if (cityMatch && streetMatch) {
      // Вариант 4: Город, улица (без номера дома) - это важный fallback
      queries.push(`${cityMatch[1]}, улица ${streetMatch[1]}, Россия`);
      queries.push(`${cityMatch[1]}, ${streetMatch[1]}, Россия`);
    }
    
    // Если не удалось извлечь структурированные данные, используем оригинальный запрос
    if (queries.length === 0) {
      queries.push(simpleQuery + ', Россия');
    }

    // Пробуем все варианты по очереди, начиная с самого точного
    return this.tryMultipleQueries(queries);
  }

  private tryMultipleQueries(queries: string[]): Observable<NominatimResponse> {
    // Пробуем первый запрос
    return new Observable<NominatimResponse>(observer => {
      let currentIndex = 0;
      
      const tryNext = () => {
        if (currentIndex >= queries.length) {
          // Все варианты испробованы, возвращаем пустой результат
          observer.next([]);
          observer.complete();
          return;
        }

        const searchQuery = queries[currentIndex];
        const params = new URLSearchParams({
          q: searchQuery,
          format: 'json',
          addressdetails: '1',
          limit: '10',
          countrycodes: 'ru',
          'accept-language': 'ru'
        });

        const headers = new HttpHeaders({
          'Accept': 'application/json'
        });

        const url = `${this.apiUrl}?${params.toString()}`;
        console.log(`Trying alternative search ${currentIndex + 1}/${queries.length}:`, url);
        console.log('Query:', searchQuery);
        
        this.http.get<NominatimResponse>(url, { headers }).subscribe({
          next: (response) => {
            if (response && response.length > 0) {
              // Нашли результаты, возвращаем их
              observer.next(response);
              observer.complete();
            } else {
              // Нет результатов, пробуем следующий вариант
              currentIndex++;
              tryNext();
            }
          },
          error: (err) => {
            console.error(`Error in alternative search ${currentIndex + 1}:`, err);
            // При ошибке пробуем следующий вариант
            currentIndex++;
            tryNext();
          }
        });
      };
      
      tryNext();
    });
  }

  private extractKeyParts(query: string): string {
    // Извлекаем ключевые части адреса: город, улица, дом
    // Например: "Дзержинск ул Петрищева 29а" -> "Дзержинск, улица Петрищева, 29а"
    let parts = query.split(/\s+/);
    const result: string[] = [];
    
    // Ищем город (обычно первое слово с большой буквы или известные города)
    const cityKeywords = ['дзержинск', 'москва', 'санкт-петербург', 'нижний новгород'];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase();
      if (cityKeywords.some(keyword => part.includes(keyword))) {
        result.push(parts[i]);
        parts = parts.slice(i + 1);
        break;
      }
    }
    
    // Ищем улицу (после "ул", "улица", "проспект" и т.д.)
    const streetKeywords = ['ул', 'улица', 'проспект', 'пр', 'переулок', 'пер'];
    for (let i = 0; i < parts.length; i++) {
      if (streetKeywords.includes(parts[i].toLowerCase())) {
        if (i + 1 < parts.length) {
          result.push(parts.slice(i + 1).join(' '));
        }
        break;
      }
    }
    
    return result.length > 0 ? result.join(', ') : query;
  }

  private cleanAndNormalizeQuery(query: string): string {
    // Убираем лишние слова и фразы в начале
    let cleaned = query
      .replace(/^(место работы|место|работа|адрес|адреса|адрес:|адрес\s*:)\s*/i, '') // Убираем служебные слова в начале
      .replace(/\b(место работы|место|работа)\b/gi, '') // Убираем служебные слова везде
      .replace(/\s+/g, ' ') // Убираем множественные пробелы
      .trim();

    // Если запрос слишком короткий после очистки, возвращаем оригинал без служебных слов
    if (cleaned.length < 3) {
      cleaned = query.replace(/^(место работы|место|работа|адрес|адреса|адрес:|адрес\s*:)\s*/i, '').trim();
    }

    // Убираем "Россия" из начала/середины, если есть - добавим в конец
    cleaned = cleaned.replace(/\b(россия|russia)\b/gi, '').trim();
    cleaned = cleaned.replace(/\s*,\s*$/, '').trim(); // Убираем запятую в конце
    cleaned = cleaned.replace(/^,\s*/, '').trim(); // Убираем запятую в начале

    // Нормализуем сокращения улиц для лучшего поиска
    cleaned = cleaned.replace(/\bул\.?\s+/gi, 'улица ');
    cleaned = cleaned.replace(/\bпр\.?\s+/gi, 'проспект ');
    cleaned = cleaned.replace(/\bпер\.?\s+/gi, 'переулок ');
    cleaned = cleaned.replace(/\bобл\.?\s+/gi, 'область ');
    cleaned = cleaned.replace(/\bг\.?\s+/gi, 'город ');

    // Пробуем улучшить формат для Nominatim: "Город, улица, номер дома"
    // Извлекаем номер дома
    const houseMatch = cleaned.match(/(\d+[а-я]?)$/i);
    if (houseMatch) {
      const houseNumber = houseMatch[1];
      const withoutHouse = cleaned.replace(/\s+\d+[а-я]?$/i, '').trim();
      
      // Пробуем найти город и улицу
      const cityMatch = withoutHouse.match(/^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/);
      const streetMatch = withoutHouse.match(/(?:улица|проспект|переулок)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i);
      
      if (cityMatch && streetMatch) {
        // Формируем структурированный запрос: "Город, улица, номер дома"
        cleaned = `${cityMatch[1]}, ${streetMatch[1]}, ${houseNumber}`;
      }
    }

    // Добавляем "Россия" в конец только если есть содержимое
    if (cleaned.length > 0) {
      cleaned = cleaned + ', Россия';
    } else {
      cleaned = 'Россия';
    }

    return cleaned;
  }

  highlightMatch(text: string, query: string): string {
    if (!query) return text;
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}




