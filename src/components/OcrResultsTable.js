import React, { useState } from 'react';

const OcrResultsTable = ({ 
  extractedData = null, 
  onTableEdit = null,
  onDownloadCsv = null,
  className = "" 
}) => {
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [editedTables, setEditedTables] = useState({});

  if (!extractedData) {
    return (
      <div className={`text-center text-gray-500 p-8 ${className}`}>
        OCR結果がありません
      </div>
    );
  }

  const { tables = [], form_fields = [], text = "" } = extractedData;
  const allTables = [
    ...tables.map((table, index) => ({
      id: `table_${index}`,
      name: `テーブル ${index + 1}`,
      type: 'table',
      data: table
    })),
    ...(form_fields.length > 0 ? [{
      id: 'form_fields',
      name: 'フォームフィールド',
      type: 'form',
      data: form_fields.map(field => [field.name, field.value])
    }] : [])
  ];

  const currentTable = allTables[currentTableIndex];

  const handleCellEdit = (rowIndex, colIndex, value) => {
    const tableId = currentTable.id;
    const updatedTables = { ...editedTables };
    
    if (!updatedTables[tableId]) {
      updatedTables[tableId] = JSON.parse(JSON.stringify(currentTable.data));
    }
    
    updatedTables[tableId][rowIndex][colIndex] = value;
    setEditedTables(updatedTables);
    
    if (onTableEdit) {
      onTableEdit(tableId, updatedTables[tableId]);
    }
  };

  const getCurrentTableData = () => {
    const tableId = currentTable?.id;
    return editedTables[tableId] || currentTable?.data || [];
  };

  const downloadTableAsCsv = () => {
    if (!currentTable) return;
    
    const data = getCurrentTableData();
    const csvContent = data.map(row => 
      row.map(cell => `"${cell?.toString().replace(/"/g, '""') || ''}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentTable.name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (onDownloadCsv) {
      onDownloadCsv(currentTable.id, csvContent);
    }
  };

  if (allTables.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800">テーブルが見つかりませんでした</h3>
          <p className="text-sm text-yellow-700 mt-1">
            このドキュメントからは構造化されたテーブルやフォームが検出されませんでした。
          </p>
          {text && (
            <div className="mt-3 text-left">
              <p className="text-sm font-medium text-yellow-800">抽出されたテキスト:</p>
              <div className="mt-1 p-2 bg-white rounded border text-sm text-gray-800 max-h-32 overflow-y-auto">
                {text.slice(0, 500)}{text.length > 500 ? '...' : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Table navigation */}
      {allTables.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentTableIndex(Math.max(0, currentTableIndex - 1))}
            disabled={currentTableIndex === 0}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            ← 前のテーブル
          </button>
          <span className="text-sm text-gray-600">
            {currentTableIndex + 1} / {allTables.length}
          </span>
          <button
            onClick={() => setCurrentTableIndex(Math.min(allTables.length - 1, currentTableIndex + 1))}
            disabled={currentTableIndex === allTables.length - 1}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            次のテーブル →
          </button>
        </div>
      )}

      {/* Table header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{currentTable?.name}</h3>
        <button
          onClick={downloadTableAsCsv}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          CSV ダウンロード
        </button>
      </div>

      {/* Table content */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {getCurrentTableData().map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border-r border-gray-200 p-2">
                      {currentTable.type === 'form' && colIndex === 0 ? (
                        // Read-only key column for form fields
                        <div className="text-gray-700 font-medium">
                          {cell || ''}
                        </div>
                      ) : (
                        // Editable cell
                        <textarea
                          value={cell || ''}
                          onChange={(e) => handleCellEdit(rowIndex, colIndex, e.target.value)}
                          className="w-full min-h-[2rem] resize-none border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded p-1"
                          style={{ 
                            height: 'auto',
                            minHeight: '2rem'
                          }}
                          onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table stats */}
      <div className="text-xs text-gray-500 text-center">
        {getCurrentTableData().length} 行 × {getCurrentTableData()[0]?.length || 0} 列
      </div>
    </div>
  );
};

export default OcrResultsTable;