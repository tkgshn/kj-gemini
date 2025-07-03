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
  let clientOptions = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  };

  // In production (Vercel), use service account key from environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    clientOptions.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // In development, use file path
    clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const client = new DocumentProcessorServiceClient(clientOptions);

  const name = `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.GOOGLE_CLOUD_LOCATION}/processors/${process.env.GOOGLE_CLOUD_PROCESSOR_ID}`;

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
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_PROCESSOR_ID) {
      throw new Error('Google Cloud環境変数が設定されていません');
    }

    // Parse form data
    const { files } = await parseForm(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'ファイルが見つかりません' });
    }

    // Validate file type
    const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    const fileType = file.type || file.mimetype;
    if (!supportedTypes.includes(fileType)) {
      return res.status(400).json({ 
        error: `サポートされていないファイル形式です: ${fileType}` 
      });
    }

    // Convert file to base64
    const fileBase64 = await fileToBase64(file.filepath);

    // Process with Document AI
    const document = await processWithDocumentAI(fileBase64, fileType);

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
        pages: document.pages?.length || 0,
        entities: document.entities || [],
        form_fields: document.pages?.[0]?.formFields?.map(field => ({
          name: field.fieldName?.textAnchor?.content || '',
          value: field.fieldValue?.textAnchor?.content || ''
        })) || [],
        tables: document.pages?.map(page => 
          page.tables?.map(table => 
            table.bodyRows?.map(row => 
              row.cells?.map(cell => cell.layout?.textAnchor?.content || '')
            )
          )
        ).flat().filter(Boolean) || []
      },
      file_info: {
        filename: file.originalFilename,
        mime_type: fileType,
        size: file.size
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