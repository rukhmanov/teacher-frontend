import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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

/**
 * Переиспользуемый компонент для работы с адресами и картами
 * Поддерживает два режима:
 * - 'edit': ввод адреса с автодополнением и картой
 * - 'view': просмотр адреса с картой
 */
@Component({
  selector: 'app-address-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="address-map-container" [class.view-mode]="mode === 'view'">
      <!-- Режим редактирования: поле ввода с автодополнением -->
      <div *ngIf="mode === 'edit'" class="address-input-section">
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
      </div>

      <!-- Режим просмотра: только адрес -->
      <div *ngIf="mode === 'view' && address" class="address-view-section">
        <div class="address-display">
          <i class="fas fa-map-marker-alt"></i>
          <span>{{ address }}</span>
        </div>
      </div>

      <!-- Карта (показывается в обоих режимах, если есть координаты) -->
      <div *ngIf="safeMapUrl" class="map-container">
        <iframe
          [src]="safeMapUrl"
          width="100%"
          [height]="mapHeight"
          frameborder="0"
          scrolling="no"
          marginheight="0"
          marginwidth="0"
          [title]="mode === 'edit' ? 'Карта с выбранным адресом' : 'Карта с адресом'"
          loading="lazy">
        </iframe>
        <div class="map-link-container">
          <div class="map-links">
            <a [href]="getOpenStreetMapLink()" 
               target="_blank" 
               class="map-link">
              <i class="fas fa-map"></i> OpenStreetMap
            </a>
            <a [href]="getYandexMapLink()" 
               target="_blank" 
               class="map-link">
              <i class="fas fa-map-marker-alt"></i> Яндекс Карты
            </a>
            <a [href]="getGoogleMapLink()" 
               target="_blank" 
               class="map-link">
              <i class="fab fa-google"></i> Google Карты
            </a>
          </div>
        </div>
      </div>
      <!-- Сообщение, если карта не загрузилась -->
      <div *ngIf="mode === 'view' && !safeMapUrl && address" class="map-error">
        <p>Не удалось загрузить карту. Проверьте координаты адреса.</p>
      </div>
    </div>
  `,
  styles: [`
    .address-map-container {
      width: 100%;
    }

    .address-input-section {
      position: relative;
      margin-bottom: 16px;
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

    .address-view-section {
      margin-bottom: 16px;
    }

    .address-display {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;

      i {
        color: var(--primary-orange, #ff6b6b);
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      span {
        color: var(--text-dark, #333);
        font-size: 15px;
        line-height: 1.5;
      }
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
    }

    .map-links {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      align-items: center;
    }

    .map-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--primary-orange, #ff6b6b);
      text-decoration: none;
      font-size: 13px;
      padding: 6px 12px;
      border: 1px solid var(--primary-orange, #ff6b6b);
      border-radius: 6px;
      transition: all 0.2s;
      white-space: nowrap;

      &:hover {
        background-color: var(--primary-orange, #ff6b6b);
        color: white;
        text-decoration: none;
      }

      i {
        font-size: 12px;
      }
    }

    .highlight {
      font-weight: 600;
      color: var(--primary-orange, #ff6b6b);
    }

    .view-mode {
      .map-container {
        margin-top: 0;
      }
    }

    .map-error {
      padding: 16px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      color: #856404;
      text-align: center;
      margin-top: 16px;
    }
  `]
})
export class AddressMapComponent implements OnInit, OnChanges {
  @Input() mode: 'edit' | 'view' = 'edit';
  @Input() placeholder: string = 'Введите адрес';
  @Input() value: string = '';
  @Input() address: string = ''; // Для режима просмотра
  @Input() latitude?: number | null; // Для режима просмотра
  @Input() longitude?: number | null; // Для режима просмотра
  @Input() mapHeight: number = 300; // Высота карты
  @Output() addressSelected = new EventEmitter<{
    address: string;
    coordinates?: { lat: number; lon: number };
    fullData?: any;
  }>();
  @Output() addressValid = new EventEmitter<boolean>(); // Событие для валидации адреса
  
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
    if (this.mode === 'edit') {
      this.inputValue = this.value;
      // Если есть начальное значение, считаем адрес валидным
      if (this.value && this.value.trim().length > 0) {
        this.addressValid.emit(true);
      } else {
        this.addressValid.emit(false);
      }
      this.setupSearch();
    } else if (this.mode === 'view') {
      // Небольшая задержка, чтобы убедиться, что все Input'ы установлены
      setTimeout(() => {
        this.updateMapFromCoordinates();
      }, 0);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Обновляем карту при изменении координат в режиме просмотра
    if (this.mode === 'view') {
      if (changes['latitude'] || changes['longitude'] || changes['address']) {
        setTimeout(() => {
          this.updateMapFromCoordinates();
        }, 0);
      }
    }
    
    // Обновляем значение в режиме редактирования
    if (this.mode === 'edit' && changes['value']) {
      this.inputValue = this.value || '';
    }
  }

  private setupSearch() {
    // Настраиваем debounce для поиска
    this.searchSubject.pipe(
      debounceTime(1000),
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
        // Если ответ пустой, пробуем альтернативный поиск
        if (!response || response.length === 0) {
          this.tryAlternativeSearch(this.inputValue.trim()).subscribe({
            next: (altResponse) => {
              if (altResponse && altResponse.length > 0) {
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
                    return (b.importance || 0) - (a.importance || 0);
                  });
                
                const withHouseNumber = russianResults.filter(item => 
                  item.address?.house_number || 
                  item.display_name?.match(/\d+[а-я]?/i)
                );
                const withoutHouseNumber = russianResults.filter(item => 
                  !item.address?.house_number && 
                  !item.display_name?.match(/\d+[а-я]?/i)
                );
                
                // Проверяем, есть ли в запросе номер дома
                const hasHouseNumberInQuery = /\d+[а-я]?/i.test(this.inputValue.trim());
                
                // Если есть результаты с номером дома и в запросе был номер дома, показываем только их
                if (hasHouseNumberInQuery && withHouseNumber.length > 0) {
                  this.suggestions = withHouseNumber
                    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                    .slice(0, 5);
                } else {
                  this.suggestions = [...withHouseNumber, ...withoutHouseNumber].slice(0, 5);
                }
              } else {
                this.suggestions = [];
              }
              this.isLoading = false;
              this.selectedIndex = -1;
            },
            error: () => {
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
          return country === 'россия' || 
                 country === 'russia' || 
                 displayName.includes('россия') ||
                 displayName.includes('russia') ||
                 !country;
        });
        
        // Проверяем, есть ли в запросе номер дома
        const hasHouseNumber = /\d+[а-я]?/i.test(this.inputValue.trim());
        
        // Разделяем результаты на те, что с номером дома и без
        const withHouseNumber = filtered.filter(item => 
          item.address?.house_number || /\d+[а-я]?/i.test(item.display_name || '')
        );
        const withoutHouseNumber = filtered.filter(item => 
          !item.address?.house_number && 
          !/\d+[а-я]?/i.test(item.display_name || '')
        );
        
        // Если есть результаты с номером дома и в запросе был номер дома, показываем только их
        let finalResults: AddressSuggestion[];
        if (hasHouseNumber && withHouseNumber.length > 0) {
          // Сортируем по важности
          finalResults = withHouseNumber.sort((a, b) => 
            (b.importance || 0) - (a.importance || 0)
          );
        } else {
          // Иначе показываем все, но сначала с номером дома
          finalResults = [
            ...withHouseNumber.sort((a, b) => (b.importance || 0) - (a.importance || 0)),
            ...withoutHouseNumber.sort((a, b) => (b.importance || 0) - (a.importance || 0))
          ];
        }
        
        this.suggestions = finalResults.slice(0, 5);
        this.isLoading = false;
        this.selectedIndex = -1;
        
      },
      error: () => {
        this.isLoading = false;
        this.suggestions = [];
      }
    });
  }

  private updateMapFromCoordinates() {
    // Преобразуем координаты в числа, если они пришли как строки
    const lat = this.latitude != null ? parseFloat(String(this.latitude)) : undefined;
    const lon = this.longitude != null ? parseFloat(String(this.longitude)) : undefined;
    
    if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
      this.selectedCoordinates = { lat, lon };
      // Формируем bbox с правильными числовыми значениями
      const bboxMinLon = lon - 0.01;
      const bboxMinLat = lat - 0.01;
      const bboxMaxLon = lon + 0.01;
      const bboxMaxLat = lat + 0.01;
      const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxMinLon},${bboxMinLat},${bboxMaxLon},${bboxMaxLat}&layer=mapnik&marker=${lat},${lon}`;
      this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(mapUrl);
    } else if (this.address) {
      // Если есть адрес, но нет координат, пробуем найти их
      this.geocodeAddress(this.address);
    } else {
      this.safeMapUrl = null;
      this.selectedCoordinates = null;
    }
  }

  private geocodeAddress(address: string) {
    const params = new URLSearchParams({
      q: address + ', Россия',
      format: 'json',
      limit: '1',
      countrycodes: 'ru'
    });

    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    const url = `${this.apiUrl}?${params.toString()}`;

    this.http.get<NominatimResponse>(url, { headers })
      .subscribe({
        next: (response) => {
          if (response && response.length > 0) {
            const lat = parseFloat(response[0].lat);
            const lon = parseFloat(response[0].lon);
            this.selectedCoordinates = { lat, lon };
            const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
            this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(mapUrl);
          } else {
            this.safeMapUrl = null;
            this.selectedCoordinates = null;
          }
        },
        error: () => {
          this.safeMapUrl = null;
          this.selectedCoordinates = null;
        }
      });
  }

  onInputChange() {
    if (this.mode !== 'edit') return;
    
    const query = this.inputValue.trim();
    
    // При изменении ввода адрес становится невалидным, пока не выбран из списка
    this.addressValid.emit(false);
    
    if (query.length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.showSuggestions = true;
    this.searchSubject.next(query);
  }

  onBlur() {
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
      const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
      this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(mapUrl);
    } else {
      this.selectedCoordinates = null;
      this.safeMapUrl = null;
    }

    // Уведомляем, что адрес выбран и валиден
    this.addressValid.emit(true);
    this.addressSelected.emit(result);
  }

  getOpenStreetMapLink(): string {
    if (this.selectedCoordinates) {
      return `https://www.openstreetmap.org/?mlat=${this.selectedCoordinates.lat}&mlon=${this.selectedCoordinates.lon}&zoom=15`;
    }
    return '#';
  }

  getYandexMapLink(): string {
    if (this.selectedCoordinates) {
      // Формат Яндекс Карт: pt=lon,lat&z=zoom
      return `https://yandex.ru/maps/?pt=${this.selectedCoordinates.lon},${this.selectedCoordinates.lat}&z=15`;
    }
    return '#';
  }

  getGoogleMapLink(): string {
    if (this.selectedCoordinates) {
      // Формат Google Карт: q=lat,lon или @lat,lon,zoomz
      return `https://www.google.com/maps?q=${this.selectedCoordinates.lat},${this.selectedCoordinates.lon}&z=15`;
    }
    return '#';
  }

  private searchAddresses(query: string): Observable<NominatimResponse> {
    const cleanedQuery = this.cleanAndNormalizeQuery(query);
    
    const params = new URLSearchParams({
      q: cleanedQuery,
      format: 'json',
      addressdetails: '1',
      limit: '10',
      countrycodes: 'ru',
      'accept-language': 'ru',
      dedupe: '1',
      polygon: '0',
      extratags: '0'
    });

    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    const url = `${this.apiUrl}?${params.toString()}`;
    
    return this.http.get<NominatimResponse>(url, { headers });
  }

  private tryAlternativeSearch(query: string): Observable<NominatimResponse> {
    let simpleQuery = query.replace(/,\s*Россия\s*$/i, '').trim();
    
    const houseNumberMatch = simpleQuery.match(/(\d+[а-я]?)$/i);
    const houseNumber = houseNumberMatch ? houseNumberMatch[1] : null;
    
    let queryWithoutHouse = simpleQuery.replace(/\s+\d+[а-я]?$/i, '').trim();
    
    // Пробуем найти город (первое слово с большой буквы или известные города)
    const cityMatch = queryWithoutHouse.match(/^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/);
    
    // Пробуем найти улицу - может быть с префиксом (ул, улица, пр, проспект) или без
    let streetMatch = queryWithoutHouse.match(/(?:ул|улица|пр|проспект|пер|переулок|бульвар|б-р)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i);
    
    // Если не нашли с префиксом, пробуем найти как отдельное слово после города
    if (!streetMatch && cityMatch) {
      const afterCity = queryWithoutHouse.substring(cityMatch[0].length).trim();
      // Если после города осталось одно или два слова - это может быть улица
      const words = afterCity.split(/\s+/);
      if (words.length <= 2 && words[0]) {
        // Создаем массив, имитирующий результат match
        streetMatch = ['', '', words.join(' ')] as RegExpMatchArray;
      }
    }
    
    const queries: string[] = [];
    
    if (cityMatch && streetMatch && houseNumber) {
      const streetName = streetMatch[1] || streetMatch[0];
      queries.push(`${cityMatch[1]}, улица ${streetName}, ${houseNumber}, Россия`);
      queries.push(`улица ${streetName}, ${houseNumber}, ${cityMatch[1]}, Россия`);
      queries.push(`${cityMatch[1]}, ${streetName}, ${houseNumber}, Россия`);
      queries.push(`${cityMatch[1]}, проспект ${streetName}, ${houseNumber}, Россия`);
      queries.push(`проспект ${streetName}, ${houseNumber}, ${cityMatch[1]}, Россия`);
    }
    
    if (cityMatch && streetMatch) {
      const streetName = streetMatch[1] || streetMatch[0];
      queries.push(`${cityMatch[1]}, улица ${streetName}, Россия`);
      queries.push(`${cityMatch[1]}, ${streetName}, Россия`);
      queries.push(`${cityMatch[1]}, проспект ${streetName}, Россия`);
      // Пробуем без указания типа улицы
      queries.push(`${cityMatch[1]}, ${streetName}, Россия`);
    }
    
    // Если нашли только город, пробуем поиск по городу
    if (cityMatch && !streetMatch) {
      queries.push(`${cityMatch[1]}, Россия`);
    }
    
    // Если ничего не нашли, пробуем оригинальный запрос
    if (queries.length === 0) {
      queries.push(simpleQuery + ', Россия');
    }

    return this.tryMultipleQueries(queries);
  }

  private tryMultipleQueries(queries: string[]): Observable<NominatimResponse> {
    return new Observable<NominatimResponse>(observer => {
      let currentIndex = 0;
      
      const tryNext = () => {
        if (currentIndex >= queries.length) {
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
        
        this.http.get<NominatimResponse>(url, { headers }).subscribe({
          next: (response) => {
            if (response && response.length > 0) {
              observer.next(response);
              observer.complete();
            } else {
              currentIndex++;
              tryNext();
            }
          },
          error: () => {
            currentIndex++;
            tryNext();
          }
        });
      };
      
      tryNext();
    });
  }

  private cleanAndNormalizeQuery(query: string): string {
    let cleaned = query
      .replace(/^(место работы|место|работа|адрес|адреса|адрес:|адрес\s*:)\s*/i, '')
      .replace(/\b(место работы|место|работа)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 3) {
      cleaned = query.replace(/^(место работы|место|работа|адрес|адреса|адрес:|адрес\s*:)\s*/i, '').trim();
    }

    cleaned = cleaned.replace(/\b(россия|russia)\b/gi, '').trim();
    cleaned = cleaned.replace(/\s*,\s*$/, '').trim();
    cleaned = cleaned.replace(/^,\s*/, '').trim();

    // Нормализуем сокращения
    cleaned = cleaned.replace(/\bул\.?\s+/gi, 'улица ');
    cleaned = cleaned.replace(/\bпр\.?\s+/gi, 'проспект ');
    cleaned = cleaned.replace(/\bпер\.?\s+/gi, 'переулок ');
    cleaned = cleaned.replace(/\bобл\.?\s+/gi, 'область ');
    cleaned = cleaned.replace(/\bг\.?\s+/gi, 'город ');
    cleaned = cleaned.replace(/\bб-р\.?\s+/gi, 'бульвар ');

    // Пробуем улучшить формат для Nominatim
    const houseMatch = cleaned.match(/(\d+[а-я]?)$/i);
    if (houseMatch) {
      const houseNumber = houseMatch[1];
      const withoutHouse = cleaned.replace(/\s+\d+[а-я]?$/i, '').trim();
      
      const cityMatch = withoutHouse.match(/^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/);
      // Пробуем найти улицу с префиксом или без
      let streetMatch = withoutHouse.match(/(?:улица|проспект|переулок|бульвар)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i);
      
      // Если не нашли с префиксом, пробуем найти как отдельное слово после города
      if (!streetMatch && cityMatch) {
        const afterCity = withoutHouse.substring(cityMatch[0].length).trim();
        const words = afterCity.split(/\s+/);
        if (words.length <= 2 && words[0]) {
          // Создаем массив, имитирующий результат match
          streetMatch = ['', '', words.join(' ')] as RegExpMatchArray;
        }
      }
      
      if (cityMatch && streetMatch) {
        const streetName = streetMatch[1] || streetMatch[0];
        cleaned = `${cityMatch[1]}, ${streetName}, ${houseNumber}`;
      }
    } else {
      // Даже без номера дома пробуем улучшить формат
      const cityMatch = cleaned.match(/^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/);
      if (cityMatch) {
        const afterCity = cleaned.substring(cityMatch[0].length).trim();
        const words = afterCity.split(/\s+/);
        // Если после города 1-2 слова, это может быть улица
        if (words.length <= 2 && words[0] && !words[0].match(/^(ул|улица|пр|проспект|пер|переулок|бульвар)$/i)) {
          cleaned = `${cityMatch[1]}, ${words.join(' ')}`;
        }
      }
    }

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
