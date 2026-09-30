import React, { useState, useEffect } from 'react';
import {
  Table as TableIcon,
  Download,
  Copy,
  Plus,
  Trash2,
  X,
  FileSpreadsheet,
  FileCode,
  FileText,
  Sparkles,
} from 'lucide-react';
import { ExtractedTable } from '../../types/document';
import { AIService } from '../../services/aiService';
import { useToast } from '../common/Toast';

interface TableExtractModalProps {
  imageSrc?: string;
  documentText?: string;
  initialTable?: ExtractedTable;
  onSaveTable?: (table: ExtractedTable) => void;
  onClose: () => void;
}

export const TableExtractModal: React.FC<TableExtractModalProps> = ({
  imageSrc,
  documentText,
  initialTable,
  onSaveTable,
  onClose,
}) => {
  const { showToast } = useToast();

  const [table, setTable] = useState<ExtractedTable>(
    initialTable || {
      id: Math.random().toString(36).substring(2, 9),
      tableName: 'Extracted Table',
      headers: ['Item / Description', 'Qty', 'Unit Price', 'Total'],
      rows: [
        ['Service Subscription', '1', '$29.00', '$29.00'],
        ['Storage Add-on', '2', '$5.00', '$10.00'],
        ['Tax (8%)', '-', '-', '$3.12'],
      ],
    }
  );

  const [isLoading, setIsLoading] = useState<boolean>(!initialTable && !!imageSrc);

  useEffect(() => {
    if (!initialTable && imageSrc) {
      handleDetectTable();
    }
  }, []);

  const handleDetectTable = async () => {
    setIsLoading(true);
    try {
      const res = await AIService.extractTable(imageSrc, documentText);
      if (res && res.headers && res.rows) {
        setTable({
          id: Math.random().toString(36).substring(2, 9),
          tableName: res.tableName || 'Extracted Table',
          headers: res.headers.length > 0 ? res.headers : ['Column 1', 'Column 2'],
          rows: res.rows.length > 0 ? res.rows : [['Sample Data 1', 'Sample Data 2']],
          summary: res.summary,
        });
        showToast('Table structure detected!', 'success');
      }
    } catch {
      showToast('Could not automatically detect table. Default template provided.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Modify cell value
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const updatedRows = [...table.rows];
    updatedRows[rowIndex][colIndex] = value;
    setTable((prev) => ({ ...prev, rows: updatedRows }));
  };

  // Modify header
  const handleHeaderChange = (colIndex: number, value: string) => {
    const updatedHeaders = [...table.headers];
    updatedHeaders[colIndex] = value;
    setTable((prev) => ({ ...prev, headers: updatedHeaders }));
  };

  // Add row
  const handleAddRow = () => {
    const emptyRow = new Array(table.headers.length).fill('');
    setTable((prev) => ({ ...prev, rows: [...prev.rows, emptyRow] }));
  };

  // Delete row
  const handleDeleteRow = (rowIndex: number) => {
    if (table.rows.length <= 1) return;
    setTable((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, idx) => idx !== rowIndex),
    }));
  };

  // Add column
  const handleAddColumn = () => {
    const newHeaders = [...table.headers, `Column ${table.headers.length + 1}`];
    const newRows = table.rows.map((row) => [...row, '']);
    setTable((prev) => ({ ...prev, headers: newHeaders, rows: newRows }));
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvContent = [
      table.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...table.rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.tableName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported CSV file!', 'success');
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonRecords = table.rows.map((row) => {
      const record: Record<string, string> = {};
      table.headers.forEach((h, idx) => {
        record[h] = row[idx] || '';
      });
      return record;
    });

    const blob = new Blob([JSON.stringify(jsonRecords, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.tableName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported JSON file!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                AI Table Extraction & Editor
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Detects rows, columns, and cell data with CSV/Excel export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDetectTable}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Scanning...' : 'Re-Detect'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Title & Controls Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <input
            type="text"
            value={table.tableName}
            onChange={(e) => setTable((prev) => ({ ...prev, tableName: e.target.value }))}
            className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Row</span>
            </button>

            <button
              onClick={handleAddColumn}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Column</span>
            </button>
          </div>
        </div>

        {/* Main Grid View */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-10 p-2 text-center text-slate-400 font-mono">#</th>
                  {table.headers.map((h, colIdx) => (
                    <th key={colIdx} className="p-2 border-r border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        value={h}
                        onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                        className="w-full font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </th>
                  ))}
                  <th className="w-10 p-2"></th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-slate-200 dark:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="p-2 text-center font-mono text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                      {rowIdx + 1}
                    </td>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="p-2 border-r border-slate-200 dark:border-slate-700/60">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1"
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        onClick={() => handleDeleteRow(rowIdx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV (Excel)</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Export JSON</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (onSaveTable) onSaveTable(table);
              onClose();
            }}
            className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            Save Table
          </button>
        </div>
      </div>
    </div>
  );
};
