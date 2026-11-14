// Чтение учебного материала: PDF (pdf.js), DOCX (JSZip + document.xml), TXT.
// Всё происходит в браузере, файл никуда не загружается.

export const MAX_PAGES = 50;
export const MAX_MB = 20;

export class ReadError extends Error {}

function cleanup(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2') // перенос слова на границе строки
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readPdf(buf) {
  const pdfjs = window.pdfjsLib;
  if (!pdfjs) throw new ReadError('Модуль чтения PDF не загрузился. Обновите страницу.');
  pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: buf }).promise;
  } catch (e) {
    if (e && e.name === 'PasswordException') throw new ReadError('PDF защищён паролем. Снимите пароль и загрузите снова.');
    throw new ReadError('Файл не похож на PDF или повреждён.');
  }
  if (doc.numPages > MAX_PAGES) throw new ReadError(`В файле ${doc.numPages} стр. В демо и в MVP — до ${MAX_PAGES} страниц.`);
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let line = '';
    let lastY = null;
    const lines = [];
    for (const it of tc.items) {
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        lines.push(line);
        line = '';
      }
      line += it.str;
      if (it.hasEOL) {
        lines.push(line);
        line = '';
        lastY = null;
      } else lastY = y;
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }
  // Абзацы: пустая строка или строка, которая заканчивается точкой и следующая с заглавной
  const text = cleanup(pages.join('\n\n')).replace(/([.!?:»])\n(?=[\p{Lu}§«—\d])/gu, '$1\n\n');
  return { text: text.replace(/(?<![.!?:»\n])\n(?!\n)/g, ' '), pages: doc.numPages };
}

async function readDocx(buf) {
  if (!window.JSZip) throw new ReadError('Модуль чтения DOCX не загрузился. Обновите страницу.');
  let zip;
  try {
    zip = await window.JSZip.loadAsync(buf);
  } catch {
    throw new ReadError('Файл не похож на DOCX или повреждён. Старый формат .doc пересохраните в .docx.');
  }
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new ReadError('В DOCX не найден текст документа.');
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const paras = [];
  for (const p of dom.getElementsByTagNameNS(W, 'p')) {
    let s = '';
    for (const n of p.getElementsByTagNameNS(W, '*')) {
      if (n.localName === 't') s += n.textContent;
      else if (n.localName === 'tab') s += ' ';
      else if (n.localName === 'br') s += '\n';
    }
    paras.push(s);
  }
  const text = cleanup(paras.join('\n\n'));
  const pages = Math.max(1, Math.ceil(text.length / 2500));
  if (pages > MAX_PAGES) throw new ReadError(`Документ примерно на ${pages} стр. В MVP — до ${MAX_PAGES} страниц.`);
  return { text, pages };
}

function decodeTxt(buf) {
  const bytes = new Uint8Array(buf);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1251').decode(bytes);
  }
}

export async function readFile(file) {
  if (file.size > MAX_MB * 1024 * 1024) throw new ReadError(`Файл больше ${MAX_MB} МБ.`);
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  let res;
  if (name.endsWith('.pdf')) res = await readPdf(buf);
  else if (name.endsWith('.docx')) res = await readDocx(buf);
  else if (name.endsWith('.txt') || name.endsWith('.md')) {
    const text = cleanup(decodeTxt(buf));
    res = { text, pages: Math.max(1, Math.ceil(text.length / 2500)) };
  } else if (name.endsWith('.doc')) throw new ReadError('Формат .doc не поддерживается. Пересохраните файл в .docx или PDF.');
  else throw new ReadError('Поддерживаются PDF, DOCX и TXT.');

  const letters = (res.text.match(/\p{L}/gu) || []).length;
  if (letters < 200) {
    if (name.endsWith('.pdf'))
      throw new ReadError('В PDF почти нет текста — похоже, это скан или картинки. Сканы в MVP не входят: нужен PDF с текстовым слоем.');
    throw new ReadError('В файле слишком мало текста: нужно хотя бы 200 букв.');
  }
  return { ...res, name: file.name };
}
