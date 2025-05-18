// Simple content type detection utility

/**
 * Basic content type detector for MCard system
 */
class ContentTypeInterpreter {
  /**
   * Detect the content type of binary data
   * @param {Buffer} data - Binary data to analyze
   * @returns {string} Detected MIME type
   */
  static detectType(data) {
    if (!data || !Buffer.isBuffer(data)) {
      return 'text/plain';
    }
    
    // Simple detection based on magic numbers/signatures
    if (data.length < 4) return 'application/octet-stream';
    
    // Check for common file signatures
    const signatures = {
      // Images
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]],
      'image/bmp': [[0x42, 0x4D]],
      
      // Documents
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
      
      // Audio
      'audio/mpeg': [[0x49, 0x44, 0x33], [0xFF, 0xFB]],
      'audio/wav': [[0x52, 0x49, 0x46, 0x46]],
      
      // Video
      'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]],
      'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
      
      // Archives
      'application/zip': [[0x50, 0x4B, 0x03, 0x04]],
      'application/gzip': [[0x1F, 0x8B]],
    };
    
    for (const [mimeType, signatureList] of Object.entries(signatures)) {
      for (const signature of signatureList) {
        if (signature.every((byte, i) => data[i] === byte)) {
          console.log('Detected by signature:', mimeType);
          return mimeType;
        }
      }
    }
    
    // Check for text content
    const isText = ContentTypeInterpreter.isTextContent(data);
    if (isText) return 'text/plain';
    
    // Default fallback
    return 'application/octet-stream';
  }
  
  /**
   * Check if data is likely to be text content
   * @param {Buffer} data - Binary data to analyze
   * @returns {boolean} True if likely text content
   */
  static isTextContent(data) {
    // Simple heuristic: check if most bytes are within ASCII printable range
    // and no NUL bytes are present
    if (!data || data.length === 0) return true;
    
    // Check for NULL bytes which typically indicate binary data
    if (data.includes(0)) return false;
    
    const printableChars = data.filter(byte => 
      (byte >= 32 && byte <= 126) || // ASCII printable
      byte === 9 ||  // Tab
      byte === 10 || // LF
      byte === 13    // CR
    ).length;
    
    // If over 90% of bytes are printable characters, likely text
    return (printableChars / data.length) > 0.9;
  }
}

export default ContentTypeInterpreter;
