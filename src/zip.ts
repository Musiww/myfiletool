import { MAX_OUTPUT, uniqueNames, type Output } from './core.ts';
const table = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++)
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(bytes: Uint8Array) { let c = 0xffffffff; for (const b of bytes)
    c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
// Store already-compressed images without recompressing them. Standard ZIP32, UTF-8 names.
export async function makeZip(outputs: Output[]): Promise<Blob> {
    if (outputs.length > 65535 || outputs.reduce((n, o) => n + o.blob.size, 0) > MAX_OUTPUT)
        throw Error('Too many results to archive. Download fewer files.');
    const names = uniqueNames(outputs.map(o => o.name)), parts: BlobPart[] = [], central: BlobPart[] = [];
    let offset = 0, centralSize = 0;
    for (let i = 0; i < outputs.length; i++) {
        const o = outputs[i], name = new TextEncoder().encode(names[i]), data = new Uint8Array(await o.blob.arrayBuffer()), crc = crc32(data);
        const local = new ArrayBuffer(30), l = new DataView(local);
        l.setUint32(0, 0x04034b50, true);
        l.setUint16(4, 20, true);
        l.setUint16(6, 0x800, true);
        l.setUint16(12, 33, true);
        l.setUint32(14, crc, true);
        l.setUint32(18, data.length, true);
        l.setUint32(22, data.length, true);
        l.setUint16(26, name.length, true);
        parts.push(local, name.buffer as ArrayBuffer, o.blob);
        const record = new ArrayBuffer(46), r = new DataView(record);
        r.setUint32(0, 0x02014b50, true);
        r.setUint16(4, 20, true);
        r.setUint16(6, 20, true);
        r.setUint16(8, 0x800, true);
        r.setUint16(14, 33, true);
        r.setUint32(16, crc, true);
        r.setUint32(20, data.length, true);
        r.setUint32(24, data.length, true);
        r.setUint16(28, name.length, true);
        r.setUint32(42, offset, true);
        central.push(record, name.buffer as ArrayBuffer);
        centralSize += 46 + name.length;
        offset += 30 + name.length + data.length;
        // Yield so progress and cancel controls remain responsive between files.
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    const end = new ArrayBuffer(22), e = new DataView(end);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, outputs.length, true);
    e.setUint16(10, outputs.length, true);
    e.setUint32(12, centralSize, true);
    e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
