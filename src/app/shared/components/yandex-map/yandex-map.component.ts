import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

declare var ymaps: any;

@Component({
  selector: 'app-yandex-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer class="yandex-map-container"></div>
  `,
  styles: [`
    .yandex-map-container {
      width: 100%;
      height: 400px;
      border-radius: 8px;
      overflow: hidden;
      min-height: 300px;
    }

    @media (max-width: 768px) {
      .yandex-map-container {
        height: 300px;
      }
    }
  `]
})
export class YandexMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @Input() address?: string;
  @Input() mapLink?: string;
  @Input() latitude?: number;
  @Input() longitude?: number;
  @Input() editable: boolean = false;
  @Input() onLocationSelect?: (lat: number, lon: number, address?: string) => void;
  
  private map: any;
  private marker: any;
  private scriptLoaded = false;
  private mapInitialized = false;

  ngOnInit() {
    this.loadYandexMaps();
  }

  ngAfterViewInit() {
    // Инициализация карты будет вызвана после загрузки скрипта
  }

  ngOnChanges(changes: SimpleChanges) {
    // Если карта уже инициализирована и изменились координаты, адрес или ссылка, обновляем карту
    if (this.mapInitialized && this.map && (changes['address'] || changes['mapLink'] || changes['latitude'] || changes['longitude'])) {
      this.updateMap();
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.destroy();
    }
  }

  private loadYandexMaps() {
    // Проверяем API ключ
    const apiKey = environment.yandexMapsApiKey;
    if (!apiKey || apiKey === 'YOUR_YANDEX_MAPS_API_KEY') {
      console.warn('Yandex Maps API key is not configured');
      return;
    }

    // Проверяем, не загружен ли уже скрипт
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]') as HTMLScriptElement;
    if (existingScript) {
      // Если скрипт уже загружен, проверяем готовность API
      if (typeof (window as any).ymaps !== 'undefined') {
        this.scriptLoaded = true;
        setTimeout(() => this.initMap(), 100);
      } else {
        // Ждем загрузки существующего скрипта
        existingScript.onload = () => {
          this.scriptLoaded = true;
          setTimeout(() => this.initMap(), 100);
        };
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      this.scriptLoaded = true;
      setTimeout(() => this.initMap(), 100);
    };
    script.onerror = () => {
      console.error('Failed to load Yandex Maps API');
    };
    document.head.appendChild(script);
  }

  private initMap() {
    if (typeof (window as any).ymaps === 'undefined') {
      if (this.scriptLoaded) {
        // Скрипт загружен, но API еще не готов, ждем
        setTimeout(() => this.initMap(), 200);
      }
      return;
    }

    if (!this.mapContainer?.nativeElement) {
      return;
    }

    (window as any).ymaps.ready(() => {
      if (this.mapInitialized) {
        // Карта уже инициализирована, обновляем
        this.updateMap();
        return;
      }

      this.determineCoordinatesAndCreateMap();
    });
  }

  private determineCoordinatesAndCreateMap() {
    // Определяем координаты
    let center: [number, number] = [55.751574, 37.573856]; // Москва по умолчанию
    let zoom = 10;

    if (this.latitude && this.longitude) {
      // Используем координаты, если они есть
      center = [this.latitude, this.longitude];
      zoom = 15;
      this.createMap(center, zoom);
    } else if (this.mapLink) {
      // Парсим координаты из ссылки на Яндекс карту
      const coords = this.parseCoordinatesFromMapLink(this.mapLink);
      if (coords) {
        center = [coords.lat, coords.lon];
        zoom = 15;
      }
      this.createMap(center, zoom);
    } else if (this.address) {
      // Геокодируем адрес (для обратной совместимости)
      this.geocodeAddress(this.address).then((coords) => {
        if (coords) {
          center = coords;
          zoom = 15;
        }
        this.createMap(center, zoom);
      });
    } else {
      this.createMap(center, zoom);
    }
  }

  private updateMap() {
    if (!this.map) {
      this.determineCoordinatesAndCreateMap();
      return;
    }

    let center: [number, number] = [55.751574, 37.573856];
    let zoom = 10;

    if (this.latitude && this.longitude) {
      center = [this.latitude, this.longitude];
      zoom = 15;
      this.updateMapWithCoords(center, zoom);
    } else if (this.mapLink) {
      const coords = this.parseCoordinatesFromMapLink(this.mapLink);
      if (coords) {
        center = [coords.lat, coords.lon];
        zoom = 15;
      }
      this.updateMapWithCoords(center, zoom);
    } else if (this.address) {
      this.geocodeAddress(this.address).then((coords) => {
        if (coords) {
          center = coords;
          zoom = 15;
        }
        this.updateMapWithCoords(center, zoom);
      });
    }
  }

  private updateMapWithCoords(center: [number, number], zoom: number) {
    if (!this.map) {
      return;
    }

    // Обновляем центр карты
    this.map.setCenter(center, zoom);

    // Обновляем маркер
    if (this.marker) {
      this.map.geoObjects.remove(this.marker);
    }

    this.marker = new (window as any).ymaps.Placemark(
      center,
      {
        balloonContent: this.address || 'Местоположение',
        hintContent: this.address || 'Местоположение'
      },
      {
        preset: 'islands#redIcon'
      }
    );

    this.map.geoObjects.add(this.marker);

    if (this.address) {
      this.marker.balloon.open();
    }
  }

  private createMap(center: [number, number], zoom: number) {
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    if (this.map) {
      // Если карта уже существует, обновляем
      this.updateMapWithCoords(center, zoom);
      return;
    }

    // Создаем карту
    this.map = new (window as any).ymaps.Map(this.mapContainer.nativeElement, {
      center: center,
      zoom: zoom,
      controls: ['zoomControl', 'fullscreenControl']
    });

    // Добавляем маркер
    this.marker = new (window as any).ymaps.Placemark(
      center,
      {
        balloonContent: this.address || 'Местоположение',
        hintContent: this.address || 'Местоположение'
      },
      {
        preset: 'islands#redIcon'
      }
    );

    this.map.geoObjects.add(this.marker);
    this.mapInitialized = true;

    // Если режим редактирования, добавляем обработчик клика на карту
    if (this.editable) {
      this.map.events.add('click', (e: any) => {
        const coords = e.get('coords');
        this.updateMarkerPosition(coords);
        if (this.onLocationSelect) {
          this.onLocationSelect(coords[0], coords[1]);
        }
      });
    }

    // Открываем балун с адресом
    if (this.address) {
      setTimeout(() => {
        if (this.marker) {
          this.marker.balloon.open();
        }
      }, 500);
    }
  }

  private updateMarkerPosition(coords: [number, number]) {
    if (!this.marker || !this.map) {
      return;
    }

    // Обновляем позицию маркера
    this.marker.geometry.setCoordinates(coords);

    // Обратное геокодирование для получения адреса
    if (typeof (window as any).ymaps !== 'undefined') {
      (window as any).ymaps.geocode(coords).then((res: any) => {
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject) {
          const address = firstGeoObject.getAddressLine();
          this.marker.properties.set({
            balloonContent: address,
            hintContent: address
          });
          
          // Вызываем callback с адресом
          if (this.onLocationSelect) {
            this.onLocationSelect(coords[0], coords[1], address);
          }
        } else {
          // Если адрес не найден, просто передаем координаты
          if (this.onLocationSelect) {
            this.onLocationSelect(coords[0], coords[1]);
          }
        }
      }).catch(() => {
        // Если геокодирование не удалось, просто передаем координаты
        if (this.onLocationSelect) {
          this.onLocationSelect(coords[0], coords[1]);
        }
      });
    } else {
      // Если API не загружен, просто передаем координаты
      if (this.onLocationSelect) {
        this.onLocationSelect(coords[0], coords[1]);
      }
    }
  }

  private parseCoordinatesFromMapLink(link: string): { lat: number; lon: number } | null {
    if (!link) return null;

    try {
      const url = new URL(link);
      
      // Парсим координаты из параметров pt (point) или ll (longitude, latitude)
      let lat: number | null = null;
      let lon: number | null = null;

      // Формат: pt=37.573856,55.751574 или pt=55.751574,37.573856
      const ptParam = url.searchParams.get('pt');
      if (ptParam) {
        const parts = ptParam.split(',');
        if (parts.length === 2) {
          // В Яндекс картах обычно формат: долгота, широта
          lon = parseFloat(parts[0]);
          lat = parseFloat(parts[1]);
        }
      }

      // Формат: ll=37.573856,55.751574 (долгота, широта)
      const llParam = url.searchParams.get('ll');
      if (llParam) {
        const parts = llParam.split(',');
        if (parts.length === 2) {
          lon = parseFloat(parts[0]);
          lat = parseFloat(parts[1]);
        }
      }

      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    } catch (e) {
      // Если не удалось распарсить как URL, пробуем найти координаты в строке
      const coordPattern = /([-+]?[0-9]*\.?[0-9]+),([-+]?[0-9]*\.?[0-9]+)/g;
      const matches = link.match(coordPattern);
      if (matches && matches.length > 0) {
        const parts = matches[0].split(',');
        if (parts.length === 2) {
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            return { lat, lon };
          }
        }
      }
    }

    return null;
  }

  private geocodeAddress(address: string): Promise<[number, number] | null> {
    return new Promise((resolve) => {
      if (typeof (window as any).ymaps === 'undefined') {
        resolve(null);
        return;
      }

      (window as any).ymaps.geocode(address, {
        results: 1
      }).then((res: any) => {
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject) {
          const coords = firstGeoObject.geometry.getCoordinates();
          resolve(coords);
        } else {
          resolve(null);
        }
      }).catch(() => {
        resolve(null);
      });
    });
  }
}



