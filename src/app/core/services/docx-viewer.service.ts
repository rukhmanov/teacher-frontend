import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DocxViewerService {
  constructor(private http: HttpClient) {}

  /**
   * Получает прокси URL для файла через бэкенд
   */
  private getProxyUrl(fileUrl: string): string {
    // Извлекаем относительный путь из полного URL
    let relativePath = fileUrl;
    
    // Если это полный URL, извлекаем путь
    try {
      const url = new URL(fileUrl);
      // Путь после домена (например: /bucket-name/files/file.docx)
      relativePath = url.pathname.substring(1); // Убираем первый /
    } catch (e) {
      // Если не удалось распарсить как URL, используем как есть
    }
    
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(relativePath)}`;
  }

  /**
   * Конвертирует .docx файл в HTML для отображения в браузере
   */
  convertDocxToHtml(fileUrl: string): Observable<string> {
    return new Observable<string>((observer) => {
      // Используем прокси через бэкенд для обхода проблем с CORS
      const proxyUrl = this.getProxyUrl(fileUrl);
      
      // Используем fetch для лучшего контроля над загрузкой
      fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/octet-stream, */*'
        },
        redirect: 'follow' // Следуем редиректам
      })
        .then((response) => {
          // Проверяем Content-Type
          const contentType = response.headers.get('content-type') || '';
          
          // Если получили HTML вместо файла, значит ошибка
          if (contentType.includes('text/html')) {
            return response.text().then((html) => {
              console.error('Получен HTML вместо файла:', html.substring(0, 500));
              throw new Error('Сервер вернул HTML страницу вместо файла. Возможно, файл недоступен или требуется авторизация.');
            });
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return response.arrayBuffer();
        })
        .then((arrayBuffer: ArrayBuffer) => {
          // Проверяем, что файл загружен
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error('Файл пуст или не загружен');
          }

          // Проверяем минимальный размер файла (docx файлы обычно больше 1KB)
          // Но уменьшим проверку до 100 байт, так как могут быть очень маленькие файлы
          if (arrayBuffer.byteLength < 100) {
            // Проверяем, не является ли это HTML ошибкой
            const textDecoder = new TextDecoder();
            const text = textDecoder.decode(arrayBuffer.slice(0, Math.min(500, arrayBuffer.byteLength)));
            if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
              throw new Error('Сервер вернул HTML страницу вместо файла. Возможно, файл недоступен или требуется авторизация.');
            }
            throw new Error(`Файл слишком мал (${arrayBuffer.byteLength} байт), возможно поврежден или не загружен полностью`);
          }

          // Проверяем сигнатуру ZIP файла (docx это ZIP архив)
          const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4));
          const zipSignature = [0x50, 0x4B, 0x03, 0x04]; // PK.. (ZIP signature)
          const isZip = zipSignature.every((byte, index) => uint8Array[index] === byte);
          
          if (!isZip) {
            // Проверяем, не является ли это HTML или текстовой ошибкой
            const textDecoder = new TextDecoder();
            const text = textDecoder.decode(arrayBuffer.slice(0, Math.min(500, arrayBuffer.byteLength)));
            if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
              throw new Error('Сервер вернул HTML страницу вместо файла. Возможно, файл недоступен или требуется авторизация.');
            }
            throw new Error('Файл не является валидным .docx файлом (не найден ZIP заголовок). Возможно, файл поврежден или это не .docx файл.');
          }

          // Динамический импорт mammoth - библиотека должна быть установлена
          return import('mammoth').then((mammothModule) => {
            const mammoth = mammothModule.default || mammothModule;
            return mammoth.convertToHtml({ arrayBuffer });
          });
        })
        .then((result: { value: string; messages: any[] }) => {
          observer.next(result.value);
          observer.complete();
        })
        .catch((error: Error) => {
          let errorMessage = 'Ошибка при загрузке или конвертации Word документа';
          
          if (error.message) {
            if (error.message.includes('Failed to fetch dynamically imported module')) {
              errorMessage = 'Библиотека mammoth не установлена. Установите её: npm install mammoth';
            } else if (error.message.includes('zip file') || error.message.includes('central directory')) {
              errorMessage = 'Файл поврежден или не является валидным .docx файлом. Попробуйте скачать файл и открыть его вручную.';
            } else if (error.message.includes('HTTP error')) {
              errorMessage = `Не удалось загрузить файл: ${error.message}. Возможно, файл недоступен или требуется авторизация.`;
            } else if (error.message.includes('HTML страницу')) {
              errorMessage = error.message;
            } else if (error.message.includes('ZIP заголовок')) {
              errorMessage = error.message;
            } else {
              errorMessage = `${errorMessage}: ${error.message}`;
            }
          }
          
          observer.error(new Error(errorMessage));
        });
    });
  }

  /**
   * Проверяет, является ли файл .docx
   */
  isDocxFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.docx');
  }

  /**
   * Проверяет, является ли файл старым форматом .doc (не поддерживается)
   */
  isDocFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.doc') && !url.endsWith('.docx');
  }

  /**
   * Получает превью Word документа (первые строки текста)
   */
  getDocxPreview(fileUrl: string, maxLength: number = 200): Observable<string> {
    return this.convertDocxToHtml(fileUrl).pipe(
      switchMap((html: string) => {
        return new Observable<string>((observer) => {
          try {
            // Создаем временный DOM элемент для парсинга HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Извлекаем текст из всех параграфов
            const paragraphs = tempDiv.querySelectorAll('p');
            let previewText = '';
            
            for (let i = 0; i < paragraphs.length && previewText.length < maxLength; i++) {
              const text = paragraphs[i].textContent || '';
              if (text.trim()) {
                previewText += (previewText ? ' ' : '') + text.trim();
                if (previewText.length >= maxLength) {
                  previewText = previewText.substring(0, maxLength) + '...';
                  break;
                }
              }
            }
            
            // Если не нашли параграфы, берем весь текст
            if (!previewText) {
              previewText = tempDiv.textContent || '';
              if (previewText.length > maxLength) {
                previewText = previewText.substring(0, maxLength) + '...';
              }
            }
            
            observer.next(previewText || 'Нет текста для предпросмотра');
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        });
      })
    );
  }
}

