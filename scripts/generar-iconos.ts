/** Genera los PNG del manifest sin dependencias: rasterizado a mano + zlib. */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const TABLA = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Buffer) =>
  (b.reduce((c, byte) => TABLA[(c ^ byte) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

function chunk(tipo: string, datos: Buffer) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** Marca: fondo oscuro con una caja de bodega en trazo claro, dentro del 80% central. */
function pixeles(n: number) {
  const fondo = [10, 10, 10];
  const trazo = [237, 237, 237];
  const g = (f: number) => Math.round(f * n);
  const [x0, x1, y0, y1] = [g(0.22), g(0.78), g(0.26), g(0.74)];
  const t = Math.max(2, g(0.055)); // grosor del trazo
  const tapa = y0 + g(0.15); // línea de la tapa de la caja
  const asa = [g(0.44), g(0.56)]; // hueco central en la tapa

  // Cada fila lleva un byte de filtro 0 adelante, como pide el formato.
  const filas: Buffer[] = [];
  for (let y = 0; y < n; y++) {
    const fila = Buffer.alloc(1 + n * 3);
    for (let x = 0; x < n; x++) {
      const enCaja = x >= x0 && x < x1 && y >= y0 && y < y1;
      const borde =
        enCaja && (x < x0 + t || x >= x1 - t || y < y0 + t || y >= y1 - t);
      const enTapa = enCaja && y >= tapa - t && y < tapa && !(x >= asa[0] && x < asa[1]);
      const [r, gr, b] = borde || enTapa ? trazo : fondo;
      fila.set([r, gr, b], 1 + x * 3);
    }
    filas.push(fila);
  }
  return Buffer.concat(filas);
}

function png(n: number) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bits por canal, color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(pixeles(n), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const n of [192, 512]) {
  const archivo = `public/icon-${n}.png`;
  writeFileSync(archivo, png(n));
  console.log(`${archivo} (${n}x${n})`);
}
