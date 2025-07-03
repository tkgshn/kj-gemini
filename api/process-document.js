/**
 * Document AI Processing API
 * Processes documents using Google Cloud Document AI
 */
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import formidable from 'formidable';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Parse multipart form data
 */
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 16 * 1024 * 1024, // 16MB
      uploadDir: os.tmpdir(),
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

/**
 * Convert file to base64
 */
const fileToBase64 = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  return fileBuffer.toString('base64');
};

/**
 * Process document with Google Cloud Document AI
 */
const processWithDocumentAI = async (fileBase64, mimeType) => {
  // Initialize Document AI client
  const client = new DocumentProcessorServiceClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to service account key
  });

  const name = `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.DOCUMENT_AI_LOCATION}/processors/${process.env.DOCUMENT_AI_PROCESSOR_ID}`;

  const request = {
    name,
    rawDocument: {
      content: fileBase64,
      mimeType,
    },
  };

  const [result] = await client.processDocument(request);
  return result.document;
};

/**
 * Extract cards from Document AI result
 */
const extractCards = (document) => {
  const cards = [];
  let cardId = 1;

  // Extract text segments
  if (document.text) {
    const textSegments = document.text.split('\n').filter(segment => 
      segment.trim().length > 10 && 
      !segment.includes('改善提案シート') &&
      !segment.includes('自分ごと化会議')
    );

    textSegments.forEach((text, index) => {
      if (text.trim()) {
        cards.push({
          id: `text_${cardId++}`,
          text: text.trim(),
          data_type: 'text',
          x: 100 + (index % 5) * 200,
          y: 100 + Math.floor(index / 5) * 120,
          width: 180,
          height: 100
        });
      }
    });
  }

  // Extract form fields
  if (document.pages && document.pages[0]?.formFields) {
    document.pages[0].formFields.forEach((field, index) => {
      if (field.fieldValue?.textAnchor?.content) {
        const text = field.fieldValue.textAnchor.content.trim();
        const fieldName = field.fieldName?.textAnchor?.content || '';
        
        if (text && text.length > 5 && !fieldName.includes('氏名')) {
          cards.push({
            id: `form_${cardId++}`,
            text: text,
            data_type: 'form_field',
            field_name: fieldName,
            x: 100 + (index % 4) * 200,
            y: 300 + Math.floor(index / 4) * 120,
            width: 180,
            height: 100
          });
        }
      }
    });
  }

  // Extract table data
  if (document.pages && document.pages[0]?.tables) {
    document.pages[0].tables.forEach((table, tableIndex) => {
      table.bodyRows?.forEach((row, rowIndex) => {
        row.cells?.forEach((cell, cellIndex) => {
          if (cell.layout?.textAnchor?.content) {
            const text = cell.layout.textAnchor.content.trim();
            if (text && text.length > 5) {
              cards.push({
                id: `table_${tableIndex}_${rowIndex}_${cellIndex}`,
                text: text,
                data_type: 'table',
                table_index: tableIndex,
                row_index: rowIndex,
                cell_index: cellIndex,
                x: 100 + (cellIndex * 200),
                y: 500 + (tableIndex * 300) + (rowIndex * 120),
                width: 180,
                height: 100
              });
            }
          }
        });
      });
    });
  }

  return cards;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.DOCUMENT_AI_PROCESSOR_ID) {
      throw new Error('Google Cloud環境変数が設定されていません');
    }

    // Parse form data
    const { files } = await parseForm(req);
    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: 'ファイルが見つかりません' });
    }

    // Validate file type
    const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!supportedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: `サポートされていないファイル形式です: ${file.mimetype}` 
      });
    }

    // Convert file to base64
    const fileBase64 = await fileToBase64(file.filepath);

    // Process with Document AI
    const document = await processWithDocumentAI(fileBase64, file.mimetype);

    // Extract cards
    const cards = extractCards(document);

    // Clean up temporary file
    await fs.unlink(file.filepath).catch(() => {});

    // Return result
    res.status(200).json({
      success: true,
      cards,
      extracted_data: {
        text: document.text || '',
        pages: document.pages?.length || 0
      },
      file_info: {
        name: file.originalFilename,
        size: file.size,
        type: file.mimetype
      }
    });

  } catch (error) {
    console.error('Document AI processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Document AI処理でエラーが発生しました'
    });
  }
}