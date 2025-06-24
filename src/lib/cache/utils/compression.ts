// Compression utilities for large cache entries

export async function compress(data: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') {
    // CompressionStream not available, return original data
    return data
  }

  try {
    const encoder = new TextEncoder()
    const compressed = await new Response(
      new Blob([encoder.encode(data)]).stream().pipeThrough(
        new CompressionStream('gzip')
      )
    ).blob()

    // Convert to base64 for storage
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        resolve(base64.split(',')[1]) // Remove data URL prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(compressed)
    })
  } catch (error) {
    console.warn('Compression failed:', error)
    return data
  }
}

export async function decompress(data: string): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    // DecompressionStream not available, return original data
    return data
  }

  try {
    // Convert from base64
    const binaryString = atob(data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const decompressed = await new Response(
      new Blob([bytes]).stream().pipeThrough(
        new DecompressionStream('gzip')
      )
    ).text()

    return decompressed
  } catch (error) {
    console.warn('Decompression failed:', error)
    return data
  }
}

export function estimateSize(data: any): number {
  const str = JSON.stringify(data)
  // Rough estimate: 1 character = 2 bytes in UTF-16
  return str.length * 2
}