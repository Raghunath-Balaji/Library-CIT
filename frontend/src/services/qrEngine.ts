/**
 * Standalone ISO/IEC 18004 QR Code Matrix Generation Engine
 * Zero dependencies, pure TypeScript, produces mathematically valid scannable QR codes.
 */

export interface QRCodeMatrix {
  size: number;
  modules: boolean[][];
}

// Polynomial Galois Field GF(256) for Reed-Solomon Error Correction
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val <<= 1;
    if (val & 0x100) {
      val ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
  }
  LOG_TABLE[0] = 0;
})();

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const factor = new Uint8Array([1, EXP_TABLE[i]]);
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      for (let k = 0; k < factor.length; k++) {
        nextPoly[j + k] ^= gmult(poly[j], factor[k]);
      }
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCompute(data: Uint8Array, ecLength: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLength);
  const res = new Uint8Array(data.length + ecLength);
  res.set(data);

  for (let i = 0; i < data.length; i++) {
    const lead = res[i];
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gmult(gen[j], lead);
      }
    }
  }
  return res.slice(data.length);
}

/**
 * Generate a Version 1 (21x21) or Version 2 (25x25) QR Code Matrix
 */
export function generateQRCode(text: string): QRCodeMatrix {
  const utf8Bytes = new TextEncoder().encode(text);
  
  // Choose version based on byte length (Level M error correction)
  // Version 1-M holds up to 14 bytes, Version 2-M holds up to 26 bytes, Version 3-M holds up to 42 bytes
  let version = 1;
  let totalDataBytes = 16;
  let ecBytes = 10;
  if (utf8Bytes.length > 14 && utf8Bytes.length <= 26) {
    version = 2;
    totalDataBytes = 28;
    ecBytes = 16;
  } else if (utf8Bytes.length > 26) {
    version = 3;
    totalDataBytes = 44;
    ecBytes = 26;
  }

  const matrixSize = 17 + 4 * version; // 21, 25, or 29
  const grid: (boolean | null)[][] = Array.from({ length: matrixSize }, () =>
    Array(matrixSize).fill(null)
  );

  // 1. Finder Patterns (7x7) at Top-Left, Top-Right, Bottom-Left
  function addFinder(rStart: number, cStart: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = rStart + r;
        const col = cStart + c;
        if (row >= 0 && row < matrixSize && col >= 0 && col < matrixSize) {
          if (
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[row][col] = true;
          } else {
            grid[row][col] = false;
          }
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, matrixSize - 7);
  addFinder(matrixSize - 7, 0);

  // 2. Alignment pattern for Version 2+
  if (version === 2) {
    const center = 18;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        grid[center + r][center + c] = isOuter || isCenter;
      }
    }
  } else if (version === 3) {
    const center = 22;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        grid[center + r][center + c] = isOuter || isCenter;
      }
    }
  }

  // 3. Timing Patterns (row 6 and col 6)
  for (let i = 8; i < matrixSize - 8; i++) {
    if (grid[6][i] === null) grid[6][i] = i % 2 === 0;
    if (grid[i][6] === null) grid[i][6] = i % 2 === 0;
  }

  // Dark module
  grid[4 * version + 9][8] = true;

  // Reserve Format Info areas
  for (let i = 0; i < 9; i++) {
    if (grid[8][i] === null) grid[8][i] = false;
    if (grid[i][8] === null) grid[i][8] = false;
  }
  for (let i = matrixSize - 8; i < matrixSize; i++) {
    if (grid[8][i] === null) grid[8][i] = false;
    if (grid[i][8] === null) grid[i][8] = false;
  }

  // 4. Encode Payload: Mode 0100 (Byte mode) + Length + Data + Terminator
  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(utf8Bytes.length, 8); // Character count
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zeroes)
  const maxDataBits = totalDataBytes * 8;
  const rem = maxDataBits - bits.length;
  pushBits(0, Math.min(4, rem));

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let pIdx = 0;
  while (bits.length < maxDataBits) {
    pushBits(padBytes[pIdx % 2], 8);
    pIdx++;
  }

  // Convert bits to byte array
  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < totalDataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // 5. Compute Error Correction Codewords
  const ecCodewords = rsCompute(dataBytes, ecBytes);
  const fullStream: number[] = [];
  for (let i = 0; i < dataBytes.length; i++) fullStream.push(dataBytes[i]);
  for (let i = 0; i < ecCodewords.length; i++) fullStream.push(ecCodewords[i]);

  const allDataBits: number[] = [];
  for (const byte of fullStream) {
    for (let b = 7; b >= 0; b--) {
      allDataBits.push((byte >> b) & 1);
    }
  }

  // 6. Placement of Data Bits (2-column zig-zag from bottom-right)
  let bitIdx = 0;
  let upward = true;

  for (let rightCol = matrixSize - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing pattern column

    const rows = upward
      ? Array.from({ length: matrixSize }, (_, i) => matrixSize - 1 - i)
      : Array.from({ length: matrixSize }, (_, i) => i);

    for (const r of rows) {
      for (const col of [rightCol, rightCol - 1]) {
        if (grid[r][col] === null) {
          const bit = bitIdx < allDataBits.length ? allDataBits[bitIdx++] === 1 : false;
          // Apply standard Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          grid[r][col] = bit !== mask;
        }
      }
    }
    upward = !upward;
  }

  // 7. Format Information (Level M, Mask 0: 101010000010010)
  // Masked format string for Level M + Mask 0 with XOR mask 0x5412
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Top-left format placement
  for (let i = 0; i <= 5; i++) grid[8][i] = formatBits[i] === 1;
  grid[8][7] = formatBits[6] === 1;
  grid[8][8] = formatBits[7] === 1;
  grid[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) grid[14 - i][8] = formatBits[i] === 1;

  // Split format placement on other finders
  for (let i = 0; i < 8; i++) {
    grid[matrixSize - 1 - i][8] = formatBits[i] === 1;
  }
  for (let i = 8; i < 15; i++) {
    grid[8][matrixSize - 15 + i] = formatBits[i] === 1;
  }

  return {
    size: matrixSize,
    modules: grid.map((row) => row.map((cell) => cell ?? false))
  };
}
