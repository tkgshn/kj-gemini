import React, { useState, useEffect } from 'react';
import { DatabaseIcon } from '../Icons';
import { getSourceTypeDisplayName } from '../../utils/displayHelpers';
import { formatAsText } from '../../utils/textFormatter';
import EditableCell from '../table/EditableCell';
import JSONDebugPanel from '../panels/JSONDebugPanel';
import TextDisplayPanel from '../panels/TextDisplayPanel';

const TableView = ({ jsonData }) => {
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [reportData, setReportData] = useState(jsonData);

  // Update reportData when jsonData changes
  useEffect(() => {
    setReportData(jsonData);
  }, [jsonData]);

  const handleCellClick = (groupId, type, itemId, currentText) => {
    setEditingCell({ groupId, type, itemId });
    setEditingText(currentText);
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const { groupId, type, itemId } = editingCell;
    const updatedData = { ...reportData };

    // Find and update the specific item
    const group = updatedData.groups.find(g => g.id === groupId);
    if (group) {
      if (type === 'challenge') {
        const challenge = group.challenges.find(c => c.id === itemId);
        if (challenge) challenge.text = editingText;
      } else if (type === 'title') {
        group.title = editingText;
      } else {
        const solution = group.solutions[type]?.find(s => s.id === itemId);
        if (solution) solution.text = editingText;
      }
    }

    setReportData(updatedData);
    setEditingCell(null);
    setEditingText('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const isEditing = (groupId, type, itemId) => {
    return editingCell?.groupId === groupId &&
           editingCell?.type === type &&
           editingCell?.itemId === itemId;
  };

  const EditableCellComponent = ({ groupId, type, itemId, text, className = "" }) => (
    <EditableCell
      groupId={groupId}
      type={type}
      itemId={itemId}
      text={text}
      className={className}
      isEditing={isEditing(groupId, type, itemId)}
      editingText={editingText}
      setEditingText={setEditingText}
      handleCellClick={handleCellClick}
      handleKeyDown={handleKeyDown}
      handleCellSave={handleCellSave}
    />
  );

  return (
    <div className="w-full h-full bg-white relative">
      {/* Main Content */}
      <div className={`transition-all duration-300 ${showJsonPanel || showTextPanel ? 'mr-96' : ''}`}>
        <div className="p-6 overflow-auto h-full">
          {/* Header with JSON Toggle */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">KJ法 分析結果</h2>
              <p className="text-sm text-gray-600 mt-1">セルをクリックして編集できます</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowTextPanel(!showTextPanel);
                  if (!showTextPanel) setShowJsonPanel(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center ${
                  showTextPanel
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <span className="ml-1">📄 テキスト表示</span>
              </button>
              <button
                onClick={() => {
                  setShowJsonPanel(!showJsonPanel);
                  if (!showJsonPanel) setShowTextPanel(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center ${
                  showJsonPanel
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <DatabaseIcon /> <span className="ml-1">JSON表示</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">概要</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{jsonData.summary.totalCards}</div>
                <div className="text-gray-600">総カード数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{jsonData.summary.totalGroups}</div>
                <div className="text-gray-600">総グループ数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{jsonData.summary.challengeGroups}</div>
                <div className="text-gray-600">課題グループ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{jsonData.summary.ungroupedCards}</div>
                <div className="text-gray-600">未グループ化</div>
              </div>
            </div>
          </div>

          {/* Excel-style Table with 3-column structure */}
          <div className="space-y-8">
            {reportData.groups
              .filter(group => group.type === 'challenge')
              .map((group, index) => (
                <div key={group.id} className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <tbody>
                      {/* Header Row: 課題 */}
                      <tr className="bg-gray-200">
                        <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-700 w-1/6">
                          課題
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600 w-1/6">
                          {/* Empty cell */}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-700">
                          <EditableCellComponent
                            groupId={group.id}
                            type="title"
                            itemId="title"
                            text={group.title}
                            className="font-semibold text-gray-800"
                          />
                        </td>
                      </tr>

                      {/* Challenge Details Row (if any) */}
                      {(group.challenges.length > 0 || group.solutions.other.length > 0) && (
                        <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                            {/* Empty cell or could be "詳細" */}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                            {/* Empty cell */}
                          </td>
                          <td className="border border-gray-300 px-4 py-4 align-top">
                            <div className="space-y-2">
                              {group.challenges.map((challenge) => (
                                <div key={challenge.id} className="mb-2">
                                  <div className="flex items-start">
                                    <span className="text-gray-600 mr-2 mt-1">•</span>
                                    <div className="flex-1">
                                      <EditableCellComponent
                                        groupId={group.id}
                                        type="challenge"
                                        itemId={challenge.id}
                                        text={challenge.text}
                                        className="text-gray-800"
                                      />
                                      <span className="text-xs text-gray-500 ml-2">
                                        ({getSourceTypeDisplayName(challenge.sourceType)})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {group.solutions.other.map((solution) => (
                                <div key={solution.id} className="mb-2">
                                  <div className="flex items-start">
                                    <span className="text-gray-600 mr-2 mt-1">•</span>
                                    <div className="flex-1">
                                      <EditableCellComponent
                                        groupId={group.id}
                                        type="other"
                                        itemId={solution.id}
                                        text={solution.text}
                                        className="text-gray-800"
                                      />
                                      <span className="text-xs text-gray-500 ml-2">
                                        ({getSourceTypeDisplayName(solution.sourceType)})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Personal Solutions Row */}
                      <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {/* Row span cell for "改善提案" - only show in first row */}
                        <td className="border border-gray-300 px-4 py-4 font-semibold text-gray-700 text-center align-middle w-1/6" rowSpan="3">
                          改善提案
                        </td>
                        <td className="border border-gray-300 px-4 py-3 font-medium text-gray-600 w-1/6">
                          個人の取組
                        </td>
                        <td className="border border-gray-300 px-4 py-4 align-top">
                          <div className="space-y-2">
                            {group.solutions.personal.map((solution) => (
                              <div key={solution.id} className="mb-2">
                                <div className="flex items-start">
                                  <span className="text-gray-600 mr-2 mt-1">•</span>
                                  <div className="flex-1">
                                    <EditableCellComponent
                                      groupId={group.id}
                                      type="personal"
                                      itemId={solution.id}
                                      text={solution.text}
                                      className="text-gray-800"
                                    />
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({solution.sourceType === 'discussion' ? '会議' : '提案シート'})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>

                      {/* Community Solutions Row */}
                      <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-3 font-medium text-gray-600">
                          地域の取組
                        </td>
                        <td className="border border-gray-300 px-4 py-4 align-top">
                          <div className="space-y-2">
                            {group.solutions.community.map((solution) => (
                              <div key={solution.id} className="mb-2">
                                <div className="flex items-start">
                                  <span className="text-gray-600 mr-2 mt-1">•</span>
                                  <div className="flex-1">
                                    <EditableCellComponent
                                      groupId={group.id}
                                      type="community"
                                      itemId={solution.id}
                                      text={solution.text}
                                      className="text-gray-800"
                                    />
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({solution.sourceType === 'discussion' ? '会議' : '提案シート'})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>

                      {/* Government Solutions Row */}
                      <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-3 font-medium text-gray-600">
                          行政の取組
                        </td>
                        <td className="border border-gray-300 px-4 py-4 align-top">
                          <div className="space-y-2">
                            {group.solutions.government.map((solution) => (
                              <div key={solution.id} className="mb-2">
                                <div className="flex items-start">
                                  <span className="text-gray-600 mr-2 mt-1">•</span>
                                  <div className="flex-1">
                                    <EditableCellComponent
                                      groupId={group.id}
                                      type="government"
                                      itemId={solution.id}
                                      text={solution.text}
                                      className="text-gray-800"
                                    />
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({solution.sourceType === 'discussion' ? '会議' : '提案シート'})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
          </div>

          {/* その他グループ */}
          {jsonData.groups.filter(group => group.type !== 'challenge').length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">その他のグループ</h3>
              <div className="space-y-6">
                {jsonData.groups
                  .filter(group => group.type !== 'challenge')
                  .map((group) => (
                    <div key={group.id} className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">{group.title}</h4>
                      <div className="space-y-4">
                        {group.solutions.personal.length > 0 && (
                          <div>
                            <h5 className="text-md font-medium text-gray-800 mb-2">### 個人の取組</h5>
                            <div className="pl-4 space-y-1">
                              {group.solutions.personal.map((solution) => (
                                <div key={solution.id}>
                                  <p className="text-gray-800">• {solution.text}</p>
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({getSourceTypeDisplayName(solution.sourceType)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {group.solutions.community.length > 0 && (
                          <div>
                            <h5 className="text-md font-medium text-gray-800 mb-2">### 地域の取組</h5>
                            <div className="pl-4 space-y-1">
                              {group.solutions.community.map((solution) => (
                                <div key={solution.id}>
                                  <p className="text-gray-800">• {solution.text}</p>
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({getSourceTypeDisplayName(solution.sourceType)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {group.solutions.government.length > 0 && (
                          <div>
                            <h5 className="text-md font-medium text-gray-800 mb-2">### 行政の取組</h5>
                            <div className="pl-4 space-y-1">
                              {group.solutions.government.map((solution) => (
                                <div key={solution.id}>
                                  <p className="text-gray-800">• {solution.text}</p>
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({getSourceTypeDisplayName(solution.sourceType)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {group.solutions.other.length > 0 && (
                          <div>
                            <h5 className="text-md font-medium text-gray-800 mb-2">### その他</h5>
                            <div className="pl-4 space-y-1">
                              {group.solutions.other.map((solution) => (
                                <div key={solution.id}>
                                  <p className="text-gray-800">• {solution.text}</p>
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({getSourceTypeDisplayName(solution.sourceType)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 未分類カード */}
          {jsonData.ungroupedCards.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">未分類のカード</h3>
              <div className="space-y-2 pl-4">
                {jsonData.ungroupedCards.map((card) => (
                  <div key={card.id} className="mb-2">
                    <p className="text-gray-800">• {card.text}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 ml-2">
                      <span>({getSourceTypeDisplayName(card.sourceType)})</span>
                      {card.isChallenge && (
                        <span className="bg-gray-100 text-gray-700 px-1 rounded">課題</span>
                      )}
                      {card.solutionPerspective && (
                        <span className="bg-gray-100 text-gray-700 px-1 rounded">
                          {card.solutionPerspective.substring(0,2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-xs text-gray-500 text-center">
            生成日時: {new Date(jsonData.generatedAt).toLocaleString('ja-JP')}
          </div>
        </div>
      </div>

      {/* JSON Debug Panel */}
      <JSONDebugPanel
        jsonData={jsonData}
        isVisible={showJsonPanel}
        onToggle={() => setShowJsonPanel(!showJsonPanel)}
      />
      
      {/* Text Display Panel */}
      <TextDisplayPanel
        jsonData={jsonData}
        isVisible={showTextPanel}
        onToggle={() => setShowTextPanel(!showTextPanel)}
        formatAsText={formatAsText}
      />
    </div>
  );
};

export default TableView;