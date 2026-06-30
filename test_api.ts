import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const API = "http://127.0.0.1:7860/v1/chat/completions";

function generateTestImageBase64(): string {
  const width = 100;
  const height = 100;

  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    pixels.push(0);
    for (let x = 0; x < width; x++) {
      if (x < 50 && y < 50) pixels.push(0, 0, 255, 255); // blue square
      else if ((x - 50) ** 2 + (y - 50) ** 2 < 900) pixels.push(255, 0, 0, 255); // red circle
      else pixels.push(200, 200, 200, 255); // gray bg
    }
  }

  const compressed = deflateSync(Buffer.from(pixels));

  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeB, data]);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeB, data, crcB]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  return png.toString("base64");
}

async function main() {
  const testB64 = generateTestImageBase64();
  console.log("Input: 100x100 gray bg, blue square top-left, red circle center");

  writeFileSync("test_input.png", Buffer.from(testB64, "base64"));
  console.log("Salvo test_input.png\n");

  console.log("=== Test: image_url + text ===\n");
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: "Bearer 123456", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash-image",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Faca uma versao melhorada desta. Mantenha o quadrado azul no canto superior esquerdo e o circulo vermelho no centro. Use gradientes e sombras." },
          { type: "image_url", image_url: { url: `data:image/png;base64,${testB64}` } },
        ]
      }],
      temperature: 1,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  console.log("Status:", res.status);
  console.log("content vazio?", content === "");
  console.log("completion_tokens:", data.usage?.completion_tokens);

  if (content) {
    const match = content.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      writeFileSync("test_output.png", Buffer.from(match[1], "base64"));
      console.log("\nGerou imagem! Salva em test_output.png");
      console.log("Analise visual: o output tem quadrado azul + circulo vermelho?");
    } else {
      console.log("Resposta sem imagem:", content.slice(0, 300));
    }
  } else {
    console.log("API ignorou a imagem — retornou vazio");
  }

  // Test 2: text-only com mesma descrição pra comparar
  console.log("\n=== Test 2: Text-only (mesma descrição) ===\n");
  const res2 = await fetch(API, {
    method: "POST",
    headers: { Authorization: "Bearer 123456", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash-image",
      messages: [{
        role: "user",
        content: "Gere uma imagem: fundo cinza claro, um quadrado azul no canto superior esquerdo, um circulo vermelho no centro, com gradientes e sombras. Estilo moderno."
      }],
      temperature: 1,
    }),
  });
  const data2 = await res2.json();
  const content2 = data2.choices?.[0]?.message?.content || "";
  const match2 = content2.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (match2) {
    writeFileSync("test_output_textonly.png", Buffer.from(match2[1], "base64"));
    console.log("Text-only tambem gerou. Salvo test_output_textonly.png");
  }
  console.log("Compara as duas imagens pra ver se sao diferentes!");
}

main().catch(console.error);
