// Genera el favicon del proyecto a partir del escudo USM (public/escudo-usm.png).
// Sin dependencias: envuelve el PNG en un contenedor ICO de una sola entrada
// (PNG-in-ICO, soportado por los navegadores actuales) y copia el icono grande.
// - src/app/icon.png   : convención App Router (navegadores modernos)
// - src/app/favicon.ico: para la petición implícita /favicon.ico
import { readFileSync, writeFileSync } from "node:fs";

const png = readFileSync("public/escudo-usm.png");

// icon.png (App Router lo expone como <link rel="icon">)
writeFileSync("src/app/icon.png", png);

// favicon.ico — contenedor ICO con una entrada PNG (width/height 0 = 256;
// las dimensiones reales las lee el navegador desde el PNG embebido).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reservado
header.writeUInt16LE(1, 2); // tipo: icono
header.writeUInt16LE(1, 4); // 1 entrada

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // ancho (0 = 256)
entry.writeUInt8(0, 1); // alto  (0 = 256)
entry.writeUInt8(0, 2); // colores de paleta
entry.writeUInt8(0, 3); // reservado
entry.writeUInt16LE(1, 4); // planos
entry.writeUInt16LE(32, 6); // bits por píxel
entry.writeUInt32LE(png.length, 8); // tamaño de los datos
entry.writeUInt32LE(6 + 16, 12); // offset de los datos

writeFileSync("src/app/favicon.ico", Buffer.concat([header, entry, png]));

console.log("favicon generado: src/app/icon.png + src/app/favicon.ico");
